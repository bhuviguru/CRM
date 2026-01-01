const { pool } = require('./src/db');

async function verify() {
    console.log('🔍 Final System Check:\n');
    try {
        const cust = await pool.query("SELECT COUNT(*) as c FROM customers");
        console.log(`✅ Customers: ${cust.rows[0].c || cust.rows[0].count}`);

        const tasks = await pool.query("SELECT COUNT(*) as c FROM tasks");
        console.log(`✅ Tasks:     ${tasks.rows[0].c || tasks.rows[0].count}`);

        try {
            const logs = await pool.query("SELECT COUNT(*) as c FROM audit_logs");
            console.log(`✅ Activity:  ${logs.rows[0].c || logs.rows[0].count}`);
        } catch (e) {
            console.log(`⚠️ Activity:  0 (Table missing or empty - ${e.message})`);
        }

    } catch (err) {
        console.error('❌ Check failed:', err.message);
    }
}

verify();
