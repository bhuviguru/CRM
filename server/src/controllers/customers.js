const { pool } = require('../db');
const { auditLog, softDelete, checkVersion } = require('../db/helpers');

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Get all active customers with filtering and pagination
 * @route GET /api/customers
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 100, max: 1000)
 * @query {string} status - Filter by status
 * @query {string} tier - Filter by tier
 * @query {number} minHealth - Minimum health score
 * @query {number} maxHealth - Maximum health score
 */
exports.getAllCustomers = async (req, res) => {
    try {
        const {
            page = DEFAULT_PAGE,
            limit = DEFAULT_LIMIT,
            status,
            tier,
            minHealth,
            maxHealth
        } = req.query;

        // Validate and sanitize inputs
        const pageNum = Math.max(1, parseInt(page) || DEFAULT_PAGE);
        const limitNum = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit) || DEFAULT_LIMIT));

        // Build query with parameterized values (SQL injection safe)
        let query = 'SELECT * FROM customers WHERE deleted_at IS NULL';
        const params = [];
        let paramCount = 1;

        if (status) {
            query += ` AND status = $${paramCount++}`;
            params.push(status);
        }

        if (tier) {
            query += ` AND tier = $${paramCount++}`;
            params.push(tier);
        }

        if (minHealth) {
            const minHealthNum = parseInt(minHealth);
            if (!isNaN(minHealthNum)) {
                query += ` AND health_score >= $${paramCount++}`;
                params.push(minHealthNum);
            }
        }

        if (maxHealth) {
            const maxHealthNum = parseInt(maxHealth);
            if (!isNaN(maxHealthNum)) {
                query += ` AND health_score <= $${paramCount++}`;
                params.push(maxHealthNum);
            }
        }

        // Pagination
        const offset = (pageNum - 1) * limitNum;
        query += ` ORDER BY updated_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
        params.push(limitNum, offset);

        const result = await pool.query(query, params);

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL';
        const countParams = [];
        let countParamNum = 1;

        if (status) {
            countQuery += ` AND status = $${countParamNum++}`;
            countParams.push(status);
        }
        if (tier) {
            countQuery += ` AND tier = $${countParamNum++}`;
            countParams.push(tier);
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({
            error: 'Failed to fetch customers',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Create a new customer
 * @route POST /api/customers
 * @body {object} customer - Customer data
 */
exports.createCustomer = async (req, res) => {
    try {
        const { account_name, industry, tier, mrr, email, phone, status, health_score } = req.body;

        // Input validation
        if (!account_name) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'account_name is required'
            });
        }

        // Generate UUID
        const id = require('crypto').randomUUID();

        const query = `
            INSERT INTO customers (
                id, account_name, industry, tier, mrr, email, phone, status, health_score
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            id,
            account_name,
            industry || 'Technology',
            tier || 'Standard',
            mrr || 0,
            email || null,
            phone || null,
            status || 'active',
            health_score || 50
        ];

        await pool.query(query, values);

        // Fetch the created customer
        const result = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
        const newCustomer = result.rows[0];

        // Real-time broadcast
        try {
            const { broadcastCustomerUpdate } = require('../services/websocket');
            await broadcastCustomerUpdate(newCustomer.id, newCustomer, 'System');
        } catch (wsError) {
            console.log('WebSocket broadcast failed (non-critical):', wsError.message);
        }

        res.status(201).json(newCustomer);
    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({
            error: 'Failed to create customer',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update customer
 * @route PUT /api/customers/:id
 * @param {string} id - Customer ID
 * @body {object} updates - Fields to update
 */
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate ID
        if (!id) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }

        // Get current version for optimistic locking
        const currentResult = await pool.query(
            'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const before = currentResult.rows[0];

        // Check version if provided (optimistic locking)
        if (updates.version !== undefined) {
            const versionMatch = await checkVersion('customers', id, updates.version);
            if (!versionMatch) {
                return res.status(409).json({
                    error: 'Conflict',
                    message: 'Customer was modified by another user. Please refresh and try again.'
                });
            }
        }

        // Build update query dynamically
        const allowedFields = [
            'account_name',
            'industry',
            'tier',
            'mrr',
            'arr',
            'status',
            'health_score',
            'primary_contact',
            'renewal_date'
        ];
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = $${paramCount++}`);
                values.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Add version increment and timestamp
        updateFields.push(`version = version + 1`);
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(id);
        const query = `
            UPDATE customers
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount} AND deleted_at IS NULL
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        const after = result.rows[0];

        // Audit log
        await auditLog('customer', id, 'updated', req.user?.id, { before, after }, req);

        // Real-time broadcast
        const { broadcastCustomerUpdate } = require('../services/websocket');
        await broadcastCustomerUpdate(id, updates, req.user?.name || 'System');

        // Check playbook triggers
        const { checkPlaybookTriggers } = require('../services/playbooks');
        await checkPlaybookTriggers(after);

        res.json(after);
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({
            error: 'Failed to update customer',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Soft delete customer
 * @route DELETE /api/customers/:id
 * @param {string} id - Customer ID
 */
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }

        const deleted = await softDelete('customers', id, req.user?.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        // Audit log
        await auditLog('customer', id, 'deleted', req.user?.id, { before: deleted }, req);

        res.json({ message: 'Customer deleted successfully', id });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({
            error: 'Failed to delete customer',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Analyze all customers with AI
 * @route POST /api/customers/analyze-all
 */
exports.analyzeAllCustomers = async (req, res) => {
    try {
        const aiService = require('../services/ai');
        const customersResult = await pool.query(
            'SELECT * FROM customers WHERE deleted_at IS NULL'
        );

        const customers = customersResult.rows;
        let analyzed = 0;
        let failed = 0;

        for (const customer of customers) {
            try {
                // Prepare usage data
                const usageData = customer.usage_metrics || {
                    support_tickets: Math.floor(Math.random() * 10),
                    email_response_time: Math.random() * 48 + 1,
                    usage_frequency: Math.random() * 50,
                    contract_value: customer.mrr || Math.floor(Math.random() * 5000) + 100
                };

                const prediction = await aiService.getChurnPrediction(usageData);
                const healthScore = Math.round((1 - prediction.churn_probability) * 100);
                const status = prediction.risk_level === 'High' ? 'At Risk' : 'Active';

                // Update customer
                await pool.query(
                    `UPDATE customers 
                     SET health_score = $1, status = $2, version = version + 1, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [healthScore, status, customer.id]
                );

                // Store prediction
                await pool.query(
                    `INSERT INTO ai_predictions (
                        customer_id, prediction_type, probability, confidence, risk_level,
                        model_name, model_version, input_features, explanation, expires_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
                    [
                        customer.id,
                        'churn',
                        prediction.churn_probability,
                        0.85,
                        prediction.risk_level,
                        'RandomForest',
                        '1.0',
                        JSON.stringify(usageData),
                        JSON.stringify({ reasoning: 'AI-based churn prediction' })
                    ]
                );

                analyzed++;

                // Real-time broadcast
                const { broadcastCustomerUpdate } = require('../services/websocket');
                await broadcastCustomerUpdate(
                    customer.id,
                    { health_score: healthScore, status },
                    'AI System'
                );

                // Trigger churn alerts
                if (prediction.risk_level === 'High' || prediction.risk_level === 'Critical') {
                    const { sendChurnAlert } = require('../services/websocket');
                    await sendChurnAlert(customer, prediction);
                }
            } catch (error) {
                console.error(`Failed to analyze customer ${customer.id}:`, error);
                failed++;
            }
        }

        res.json({
            message: 'Analysis complete',
            total: customers.length,
            analyzed,
            failed
        });
    } catch (error) {
        console.error('Error analyzing customers:', error);
        res.status(500).json({
            error: 'Failed to analyze customers',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Get customer activity history
 * @route GET /api/customers/:id/activity
 */
exports.getCustomerActivity = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Audit Logs
        const auditQuery = `
            SELECT 
                'system' as type,
                action as title,
                changes,
                created_at,
                user_id
            FROM audit_logs 
            WHERE entity_id = $1 AND entity_type = 'customer'
            ORDER BY created_at DESC
            LIMIT 50
        `;

        // 2. Fetch Tasks
        const taskQuery = `
            SELECT 
                'task' as type,
                title,
                status as changes, 
                created_at,
                'system' as user_id
            FROM tasks
            WHERE customer_id = $1
            ORDER BY created_at DESC
            LIMIT 50
        `;

        const [auditRes, taskRes] = await Promise.all([
            pool.query(auditQuery, [id]),
            pool.query(taskQuery, [id])
        ]);

        // Combine and Sort
        const activities = [
            ...auditRes.rows.map(row => ({
                id: `audit-${row.created_at}`,
                type: 'system',
                title: row.title === 'updated' ? 'Customer Profile Updated' : `Customer ${row.title}`,
                desc: row.title === 'updated' ? 'Updated properties' : 'System event',
                timestamp: row.created_at,
                icon: 'Settings'
            })),
            ...taskRes.rows.map(row => ({
                id: `task-${row.created_at}`,
                type: 'task',
                title: row.title,
                desc: `Status: ${row.changes || 'Open'}`,
                timestamp: row.created_at,
                icon: 'CheckSquare'
            }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(activities);

    } catch (error) {
        console.error('Error fetching customer activity:', error);
        res.status(500).json({ error: 'Failed to fetch activity history' });
    }
};
