const { Server } = require('socket.io');
const { pool } = require('../db');

let io;

/**
 * Initialize WebSocket server
 * @param {http.Server} server - HTTP server instance
 * @returns {Promise<Server>} Socket.IO server instance
 */
const initializeWebSocket = async server => {
    io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    });

    // Redis adapter (optional - for multi-instance scaling)
    // Uncomment if REDIS_URL is set in environment
    /*
    if (process.env.REDIS_URL) {
        const { createAdapter } = require('@socket.io/redis-adapter');
        const { createClient } = require('redis');
        
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        
        await Promise.all([pubClient.connect(), subClient.connect()]);
        
        io.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Redis adapter enabled for WebSocket');
    }
    */

    // Track connected users
    const connectedUsers = new Map();

    io.on('connection', socket => {
        console.log(`✅ User connected: ${socket.id}`);

        // Join user-specific room
        socket.on('join', userId => {
            socket.userId = userId;
            socket.join(`user:${userId}`);
            connectedUsers.set(socket.id, { userId, connectedAt: new Date() });

            // Broadcast user online status
            io.emit('user:online', { userId, socketId: socket.id });
        });

        // Join customer room (for live collaboration)
        socket.on('view:customer', customerId => {
            socket.join(`customer:${customerId}`);

            // Broadcast who's viewing
            io.to(`customer:${customerId}`).emit('viewer:joined', {
                userId: socket.userId,
                customerId,
                timestamp: new Date()
            });
        });

        // Leave customer room
        socket.on('leave:customer', customerId => {
            socket.leave(`customer:${customerId}`);

            io.to(`customer:${customerId}`).emit('viewer:left', {
                userId: socket.userId,
                customerId
            });
        });

        // Real-time typing indicator
        socket.on('typing:start', data => {
            socket.to(`customer:${data.customerId}`).emit('user:typing', {
                userId: socket.userId,
                customerId: data.customerId
            });
        });

        socket.on('typing:stop', data => {
            socket.to(`customer:${data.customerId}`).emit('user:stopped_typing', {
                userId: socket.userId,
                customerId: data.customerId
            });
        });

        socket.on('disconnect', () => {
            const user = connectedUsers.get(socket.id);
            if (user) {
                io.emit('user:offline', { userId: user.userId, socketId: socket.id });
                connectedUsers.delete(socket.id);
            }
            console.log(`❌ User disconnected: ${socket.id}`);
        });
    });

    console.log('✅ WebSocket initialized successfully');
    return io;
};

/**
 * Broadcast customer update to all connected users
 * @param {string} customerId - Customer ID
 * @param {object} changes - Changed fields
 * @param {string} updatedBy - User who made the update
 */
const broadcastCustomerUpdate = async (customerId, changes, updatedBy) => {
    if (!io) {
        console.warn('⚠️ WebSocket not initialized, skipping broadcast');
        return;
    }

    // Broadcast to all users
    io.emit('customer:updated', {
        customerId,
        changes,
        updatedBy,
        timestamp: new Date().toISOString()
    });

    // Also broadcast to users viewing this specific customer
    io.to(`customer:${customerId}`).emit('customer:live_update', {
        changes,
        updatedBy
    });
};

/**
 * Broadcast new activity to all users viewing customer
 * @param {string} customerId - Customer ID
 * @param {object} activity - Activity data
 */
const broadcastActivity = async (customerId, activity) => {
    if (!io) {return;}

    io.to(`customer:${customerId}`).emit('activity:new', {
        ...activity,
        timestamp: new Date().toISOString()
    });

    // Also send to customer owner
    try {
        const customer = await pool.query('SELECT account_owner_id FROM customers WHERE id = $1', [
            customerId
        ]);

        if (customer.rows[0]?.account_owner_id) {
            io.to(`user:${customer.rows[0].account_owner_id}`).emit('activity:notification', {
                customerId,
                activity
            });
        }
    } catch (err) {
        console.error('Failed to send activity notification:', err);
    }
};

/**
 * Send notification to specific user
 * @param {string} userId - User ID
 * @param {object} notification - Notification data
 */
const sendNotification = async (userId, notification) => {
    if (!io) {return;}

    // Save to database
    try {
        await pool.query(
            `
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES ($1, $2, $3, $4, $5)
        `,
            [userId, notification.type, notification.title, notification.message, notification.link]
        );
    } catch (err) {
        console.error('Failed to save notification:', err);
    }

    // Send via WebSocket
    io.to(`user:${userId}`).emit('notification', notification);
};

/**
 * Broadcast to all users
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const broadcast = (event, data) => {
    if (!io) {return;}
    io.emit(event, data);
};

/**
 * Send churn alert to team
 * @param {object} customer - Customer data
 * @param {object} prediction - AI prediction data
 */
const sendChurnAlert = async (customer, prediction) => {
    const notification = {
        type: 'churn_alert',
        title: `🚨 High Churn Risk: ${customer.account_name}`,
        message: `Churn probability: ${(prediction.churn_probability * 100).toFixed(1)}%`,
        link: `/customers/${customer.id}`,
        severity: prediction.risk_level
    };

    // Send to account owner
    if (customer.account_owner_id) {
        await sendNotification(customer.account_owner_id, notification);
    }

    // Broadcast to all managers (if users table exists)
    try {
        const managersResult = await pool.query(
            "SELECT id FROM users WHERE role IN ('admin', 'manager') AND is_active = TRUE"
        );

        for (const manager of managersResult.rows) {
            await sendNotification(manager.id, notification);
        }
    } catch (err) {
        // Users table might not exist yet
        console.log('⚠️ Users table not found, skipping manager notifications');
    }

    // Trigger Slack webhook if configured
    await sendSlackAlert(customer, prediction);
};

/**
 * Send Slack notification
 * @param {object} customer - Customer data
 * @param {object} prediction - AI prediction data
 */
const sendSlackAlert = async (customer, prediction) => {
    if (!process.env.SLACK_WEBHOOK_URL) {return;}

    const axios = require('axios');

    try {
        await axios.post(process.env.SLACK_WEBHOOK_URL, {
            channel: '#customer-success',
            username: 'SahayakCRM',
            icon_emoji: ':rotating_light:',
            attachments: [
                {
                    color: prediction.risk_level === 'Critical' ? 'danger' : 'warning',
                    title: `High Churn Risk: ${customer.account_name}`,
                    fields: [
                        {
                            title: 'Churn Probability',
                            value: `${(prediction.churn_probability * 100).toFixed(1)}%`,
                            short: true
                        },
                        { title: 'Risk Level', value: prediction.risk_level, short: true },
                        {
                            title: 'Health Score',
                            value: `${customer.health_score}/100`,
                            short: true
                        }
                    ],
                    actions: [
                        {
                            type: 'button',
                            text: 'View Customer',
                            url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/customers/${customer.id}`
                        }
                    ]
                }
            ]
        });
        console.log('✅ Slack alert sent');
    } catch (err) {
        console.error('Failed to send Slack alert:', err.message);
    }
};

/**
 * Trigger Zapier webhook
 * @param {string} event - Event name
 * @param {object} data - Event data
 */
const triggerZapierWebhook = async (event, data) => {
    if (!process.env.ZAPIER_WEBHOOK_URL) {return;}

    const axios = require('axios');

    try {
        await axios.post(process.env.ZAPIER_WEBHOOK_URL, {
            event,
            data,
            timestamp: new Date().toISOString()
        });
        console.log(`✅ Zapier webhook triggered: ${event}`);
    } catch (err) {
        console.error('Failed to trigger Zapier webhook:', err.message);
    }
};

module.exports = {
    initializeWebSocket,
    broadcastCustomerUpdate,
    broadcastActivity,
    sendNotification,
    broadcast,
    sendChurnAlert,
    sendSlackAlert,
    triggerZapierWebhook
};
