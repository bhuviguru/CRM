const { pool } = require('./src/db');

async function cleanAndSeed() {
    console.log('🧹 Wiping child tables first...');

    const tables = ['ai_predictions', 'tasks', 'audit_logs', 'email_logs', 'notifications'];

    for (const table of tables) {
        try {
            await pool.query(`DELETE FROM ${table}`);
            console.log(`✓ Cleared ${table}`);
        } catch (e) {
            // Table might not exist, ignore
            console.log(`- Skiping ${table} (maybe not exists)`);
        }
    }

    console.log('🧹 Wiping customer data...');
    try {
        await pool.query('DELETE FROM customers');
        console.log('✓ Cleared customers');
    } catch (e) {
        console.error('❌ Failed to clear customers:', e.message);
        process.exit(1);
    }

    console.log('🌱 Seeding fresh cust-N data...');
    const customers = [
        { id: 'cust-1', name: 'Alpha Corp', health: 80, email: 'contact@alpha.com' },
        { id: 'cust-2', name: 'Beta Ltd', health: 60, email: 'info@beta.com' },
        { id: 'cust-3', name: 'Gamma Inc', health: 40, email: 'support@gamma.com' },
        { id: 'cust-4', name: 'Delta Systems', health: 90, email: 'sales@delta.com' },
        { id: 'cust-5', name: 'Epsilon Grp', health: 20, email: 'hello@epsilon.com' }
    ];

    for (const c of customers) {
        await pool.query(`
            INSERT INTO customers (id, account_name, health_score, mrr, status, email, tier, industry)
            VALUES (?, ?, ?, ?, ?, ?, 'Standard', 'Technology')
        `, [c.id, c.name, c.health, 5000, 'active', c.email]);
    }

    console.log('✅ Database reset complete with 5 sequential IDs.');
}

cleanAndSeed().catch(console.error);
