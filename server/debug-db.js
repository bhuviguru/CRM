const { pool } = require('./src/db');

async function debug() {
    try {
        console.log('--- CUSTOMERS ---');
        const customers = await pool.query('SELECT id, account_name, health_score, status, mrr FROM customers LIMIT 5');
        console.table(customers.rows);

        console.log('\n--- AI PREDICTIONS ---');
        const predictions = await pool.query('SELECT customer_id, risk_level, probability, explanation, created_at FROM ai_predictions ORDER BY created_at DESC LIMIT 5');
        console.table(predictions.rows);
    } catch (err) {
        console.error(err);
    }
}

debug();
