const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const initEnterpriseDb = async () => {
    try {
        console.log('🚀 Initializing Enterprise Database Schema...\n');

        // Read and execute enterprise schema
        const schemaPath = path.join(__dirname, '../db/enterprise_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('📋 Creating tables...');
        await pool.query(schema);
        console.log('✅ Tables created successfully\n');

        // Seed initial data
        console.log('🌱 Seeding initial data...');

        // Create sample customer
        const customerResult = await pool.query(`
            INSERT INTO customers (
                account_name, industry, tier, status, health_score, mrr, arr,
                primary_contact, usage_metrics, tags
            ) VALUES (
                'Acme Corporation',
                'SaaS',
                'Enterprise',
                'Active',
                85,
                5000.00,
                60000.00,
                '{"name": "John Doe", "email": "john@acme.com", "phone": "+1-555-0100", "role": "CTO"}',
                '{"last_login": "2025-12-30T12:00:00Z", "login_frequency_30d": 45, "feature_adoption_rate": 0.75, "support_tickets_30d": 2, "nps_score": 8}',
                ARRAY['enterprise', 'tech']
            ) RETURNING id
        `);

        const customerId = customerResult.rows[0].id;
        console.log(`✅ Sample customer created: ${customerId}\n`);

        // Create sample AI prediction
        await pool.query(
            `
            INSERT INTO ai_predictions (
                customer_id, prediction_type, probability, confidence, risk_level,
                model_name, model_version, input_features, explanation, expires_at
            ) VALUES (
                $1, 'churn', 0.15, 0.92, 'Low',
                'RandomForest', 'v1.0.0',
                '{"login_frequency_30d": 45, "support_tickets_30d": 2, "nps_score": 8}',
                '{"top_factors": [{"feature": "login_frequency_30d", "impact": -0.4, "direction": "negative"}, {"feature": "nps_score", "impact": -0.3, "direction": "negative"}], "reasoning": "High engagement and satisfaction indicate low churn risk."}',
                CURRENT_TIMESTAMP + INTERVAL '24 hours'
            )
        `,
            [customerId]
        );
        console.log('✅ Sample AI prediction created\n');

        // Create sample activity
        await pool.query(
            `
            INSERT INTO activity_logs (
                customer_id, activity_type, performed_by, title, description, sentiment
            ) VALUES (
                $1, 'meeting_held', NULL, 'Quarterly Business Review',
                'Discussed product roadmap and expansion opportunities', 'positive'
            )
        `,
            [customerId]
        );
        console.log('✅ Sample activity created\n');

        // Create sample playbook
        const playbookResult = await pool.query(`
            INSERT INTO playbooks (
                name, description, trigger, actions, enabled, priority
            ) VALUES (
                'High Churn Risk Alert',
                'Automatically notify CS team when churn risk exceeds 70%',
                '{"type": "churn_risk_high", "conditions": {"probability": {"gt": 0.7}}}',
                '[{"type": "create_task", "config": {"title": "Urgent: High churn risk detected", "priority": "high"}}, {"type": "send_slack", "config": {"channel": "#customer-success", "message": "Customer at high churn risk"}}]',
                true,
                1
            ) RETURNING id
        `);
        console.log(`✅ Sample playbook created: ${playbookResult.rows[0].id}\n`);

        console.log('🎉 Enterprise database initialized successfully!');
        console.log('\n📊 Summary:');
        console.log('   - Customers: 1');
        console.log('   - AI Predictions: 1');
        console.log('   - Activities: 1');
        console.log('   - Playbooks: 1');
        console.log('\n✨ Ready for production use!\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        process.exit(1);
    }
};

initEnterpriseDb();
