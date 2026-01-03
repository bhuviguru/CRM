const { pool } = require('../db');
const {
    broadcastCustomerUpdate,
    broadcastActivity,
    // sendChurnAlert,
    triggerZapierWebhook
} = require('../services/websocket');

/**
 * Execute playbook when conditions are met
 */
const executePlaybook = async (playbook, customer) => {
    console.log(`🤖 Executing playbook: ${playbook.name} for customer: ${customer.account_name}`);

    const execution = {
        playbook_id: playbook.id,
        customer_id: customer.id,
        status: 'running',
        actions_executed: []
    };

    try {
        // Log execution start
        const execResult = await pool.query(
            `
            INSERT INTO playbook_executions (playbook_id, customer_id, status)
            VALUES ($1, $2, 'running')
            RETURNING id
        `,
            [playbook.id, customer.id]
        );

        const executionId = execResult.rows[0].id;

        // Execute each action
        for (const action of playbook.actions) {
            try {
                await executeAction(action, customer, playbook);
                execution.actions_executed.push({
                    action: action.type,
                    status: 'success',
                    timestamp: new Date()
                });
            } catch (err) {
                console.error(`Failed to execute action ${action.type}:`, err);
                execution.actions_executed.push({
                    action: action.type,
                    status: 'failed',
                    error: err.message,
                    timestamp: new Date()
                });
            }
        }

        // Update execution status
        await pool.query(
            `
            UPDATE playbook_executions
            SET status = 'completed', completed_at = CURRENT_TIMESTAMP, actions_executed = $1
            WHERE id = $2
        `,
            [JSON.stringify(execution.actions_executed), executionId]
        );

        // Update playbook last triggered
        await pool.query(
            `
            UPDATE playbooks
            SET last_triggered_at = CURRENT_TIMESTAMP, execution_count = execution_count + 1
            WHERE id = $1
        `,
            [playbook.id]
        );

        console.log(`✅ Playbook executed successfully: ${playbook.name}`);
    } catch (err) {
        console.error(`Playbook execution failed:`, err);
    }
};

/**
 * Execute individual action
 */
const executeAction = async (action, customer, _playbook) => {
    switch (action.type) {
        case 'create_task':
            await createTaskAction(action, customer);
            break;
        case 'send_email':
            await sendEmailAction(action, customer);
            break;
        case 'send_slack':
            await sendSlackAction(action, customer);
            break;
        case 'update_status':
            await updateStatusAction(action, customer);
            break;
        case 'assign_csm':
            await assignCSMAction(action, customer);
            break;
        case 'trigger_webhook':
            await triggerWebhookAction(action, customer);
            break;
        default:
            console.log(`Unknown action type: ${action.type}`);
    }
};

/**
 * Create task action
 */
const createTaskAction = async (action, customer) => {
    // const taskController = require('../controllers/tasks');

    await pool.query(
        `
        INSERT INTO tasks (customer_id, title, description, priority, assigned_to, due_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, 'system')
    `,
        [
            customer.id,
            action.config.title || 'Automated Task',
            action.config.description || '',
            action.config.priority || 'medium',
            customer.account_owner_id || null,
            action.config.due_date ? new Date(Date.now() + action.config.due_hours * 3600000) : null
        ]
    );

    console.log(`✅ Task created: ${action.config.title}`);
};

/**
 * Send email action
 */
const sendEmailAction = async (action, customer) => {
    // This would integrate with your email service
    console.log(`📧 Email sent to ${customer.primary_contact?.email}: ${action.config.template}`);

    // Log activity
    await pool.query(
        `
        INSERT INTO activity_logs (customer_id, activity_type, title, description, performed_by)
        VALUES ($1, 'email_sent', $2, $3, NULL)
    `,
        [
            customer.id,
            `Automated Email: ${action.config.subject}`,
            `Template: ${action.config.template}`
        ]
    );

    // Broadcast activity
    await broadcastActivity(customer.id, {
        type: 'email_sent',
        title: `Automated Email: ${action.config.subject}`
    });
};

/**
 * Send Slack action
 */
const sendSlackAction = async (action, _customer) => {
    // const { sendSlackAlert } = require('../services/websocket');

    // Send custom Slack message
    // console.log(`💬 Slack message sent: ${action.config.message}`); // Optional: keep log but unused var is the issue
    console.log(`💬 Slack message sent: ${action.config.message}`);
};

/**
 * Update customer status
 */
const updateStatusAction = async (action, customer) => {
    await pool.query(
        `
        UPDATE customers
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `,
        [action.config.new_status, customer.id]
    );

    // Broadcast update
    await broadcastCustomerUpdate(customer.id, { status: action.config.new_status }, 'system');

    console.log(`✅ Status updated to: ${action.config.new_status}`);
};

/**
 * Assign CSM action
 */
const assignCSMAction = async (action, customer) => {
    await pool.query(
        `
        UPDATE customers
        SET account_owner_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
    `,
        [action.config.csm_id, customer.id]
    );

    console.log(`✅ CSM assigned: ${action.config.csm_id}`);
};

/**
 * Trigger webhook action
 */
const triggerWebhookAction = async (action, customer) => {
    await triggerZapierWebhook(action.config.event, {
        customer_id: customer.id,
        customer_name: customer.account_name,
        ...action.config.data
    });
};

/**
 * Check if playbook should be triggered
 */
const checkPlaybookTriggers = async customer => {
    // Get all active playbooks
    const result = await pool.query(`
        SELECT * FROM playbooks WHERE enabled = TRUE ORDER BY priority DESC
    `);

    for (const playbook of result.rows) {
        const trigger = playbook.trigger;

        // Check trigger conditions
        let shouldTrigger = false;

        switch (trigger.type) {
            case 'churn_risk_high':
                shouldTrigger = customer.health_score < 50;
                break;
            case 'health_score_drop':
                // Would need to compare with previous value
                shouldTrigger = customer.health_score < trigger.conditions?.threshold;
                break;
            case 'renewal_approaching':
                if (customer.renewal_date) {
                    const daysUntilRenewal = Math.floor(
                        (new Date(customer.renewal_date) - new Date()) / (1000 * 60 * 60 * 24)
                    );
                    shouldTrigger = daysUntilRenewal <= trigger.conditions?.days;
                }
                break;
            case 'status_changed':
                shouldTrigger = customer.status === trigger.conditions?.status;
                break;
        }

        if (shouldTrigger) {
            await executePlaybook(playbook, customer);
        }
    }
};

/**
 * Initialize default playbooks
 */
const initializeDefaultPlaybooks = async () => {
    const playbooks = [
        {
            name: 'High Churn Risk Alert',
            description: 'Automatically alert team when churn risk exceeds 70%',
            trigger: {
                type: 'churn_risk_high',
                conditions: { probability: { gt: 0.7 } }
            },
            actions: [
                {
                    type: 'create_task',
                    config: {
                        title: 'URGENT: High churn risk detected',
                        description:
                            'Customer showing high churn risk. Schedule intervention call immediately.',
                        priority: 'urgent',
                        due_hours: 24
                    }
                },
                {
                    type: 'send_slack',
                    config: {
                        channel: '#customer-success',
                        message: 'High churn risk alert'
                    }
                },
                {
                    type: 'trigger_webhook',
                    config: {
                        event: 'customer.churn_risk.high'
                    }
                }
            ],
            enabled: true,
            priority: 1
        },
        {
            name: 'New Customer Onboarding',
            description: 'Automated onboarding workflow for new customers',
            trigger: {
                type: 'status_changed',
                conditions: { status: 'Active' }
            },
            actions: [
                {
                    type: 'create_task',
                    config: {
                        title: 'Schedule kickoff call',
                        priority: 'high',
                        due_hours: 24
                    }
                },
                {
                    type: 'send_email',
                    config: {
                        template: 'welcome_email',
                        subject: 'Welcome to SahayakCRM!'
                    }
                },
                {
                    type: 'create_task',
                    config: {
                        title: '30-day check-in',
                        priority: 'medium',
                        due_hours: 720
                    }
                }
            ],
            enabled: true,
            priority: 2
        }
    ];

    for (const playbook of playbooks) {
        try {
            await pool.query(
                `
                INSERT INTO playbooks (name, description, trigger, actions, enabled, priority, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, NULL)
                ON CONFLICT DO NOTHING
            `,
                [
                    playbook.name,
                    playbook.description,
                    JSON.stringify(playbook.trigger),
                    JSON.stringify(playbook.actions),
                    playbook.enabled,
                    playbook.priority
                ]
            );
        } catch (err) {
            console.error(`Failed to create playbook ${playbook.name}:`, err);
        }
    }

    console.log('✅ Default playbooks initialized');
};

module.exports = {
    executePlaybook,
    checkPlaybookTriggers,
    initializeDefaultPlaybooks
};
