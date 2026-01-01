const { pool } = require('../db');

exports.getStats = async (req, res) => {
    try {
        // Run aggregations in parallel for performance
        const [
            totalRes,
            activeRes,
            riskRes,
            avgHealthRes,
            revenueRiskRes
        ] = await Promise.all([
            pool.query('SELECT COUNT(*) as count FROM customers'),
            pool.query("SELECT COUNT(*) as count FROM customers WHERE status = 'active' OR status = 'Active'"),
            pool.query('SELECT COUNT(*) as count FROM customers WHERE health_score < 50'),
            pool.query('SELECT AVG(health_score) as avg FROM customers'),
            pool.query('SELECT SUM(mrr) as sum FROM customers WHERE health_score < 50')
        ]);

        const stats = {
            totalCustomers: parseInt(totalRes.rows[0].count || 0),
            activeCustomers: parseInt(activeRes.rows[0].count || 0),
            churnRisk: parseInt(riskRes.rows[0].count || 0),
            avgHealthScore: Math.round(avgHealthRes.rows[0].avg || 0),
            revenueAtRisk: parseFloat(revenueRiskRes.rows[0].sum || 0)
        };

        res.json(stats);
    } catch (error) {
        console.error('Dashboard stats failed:', error);
        res.status(500).json({ error: 'Failed to load dashboard statistics' });
    }
};

exports.getChurnRisk = async (req, res) => {
    try {
        const query = `
            SELECT account_name as name, (100 - health_score) as churn 
            FROM customers 
            ORDER BY health_score ASC 
            LIMIT 5
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Churn risk stats failed:', error);
        res.status(500).json({ error: 'Failed to load churn risk data' });
    }
};
