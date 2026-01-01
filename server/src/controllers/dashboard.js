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

exports.getRecentActivity = async (req, res) => {
    try {
        // Fetch latest 5 updates/creations
        // We use updated_at to track activity
        const query = `
            SELECT 
                account_name as name, 
                health_score, 
                status, 
                updated_at,
                (CASE 
                    WHEN health_score < 50 THEN 'High churn risk detected'
                    WHEN health_score < 70 THEN 'Health score dropped'
                    WHEN status = 'Active' THEN 'Customer active'
                    ELSE 'Status updated'
                END) as "desc",
                (CASE 
                    WHEN health_score < 50 THEN 'Critical'
                    WHEN health_score < 70 THEN 'Warning'
                    ELSE 'Update'
                END) as badge,
                (CASE 
                    WHEN health_score < 50 THEN 'text-rose-500'
                    WHEN health_score < 70 THEN 'text-orange-500'
                    ELSE 'text-blue-500'
                END) as "badgeColor"
            FROM customers 
            ORDER BY updated_at DESC 
            LIMIT 5
        `;
        const result = await pool.query(query);

        // Format for frontend
        const activities = result.rows.map(row => ({
            name: row.name,
            desc: `${row.desc} (${row.health_score}%)`,
            badge: row.badge,
            badgeColor: row.badgeColor
        }));

        res.json(activities);
    } catch (error) {
        console.error('Recent activity failed:', error);
        res.status(500).json({ error: 'Failed to load recent activity' });
    }
};
