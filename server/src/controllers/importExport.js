const { pool } = require('../db');
const { Parser } = require('json2csv');

/**
 * Import/Export Controller
 */

// Export customers to CSV
exports.exportCustomers = async (req, res) => {
    try {
        const query = 'SELECT * FROM customers WHERE deleted_at IS NULL';
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No customers to export' });
        }

        const fields = [
            'id',
            'account_name',
            'industry',
            'tier',
            'mrr',
            'health_score',
            'status',
            'created_at'
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=customers.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export customers' });
    }
};

// Export contacts to CSV
exports.exportContacts = async (req, res) => {
    try {
        const query = 'SELECT * FROM contacts WHERE deleted_at IS NULL';
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No contacts to export' });
        }

        const fields = [
            'id',
            'customer_id',
            'name',
            'email',
            'phone',
            'title',
            'is_primary',
            'created_at'
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=contacts.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export contacts' });
    }
};

// Export tasks to CSV
exports.exportTasks = async (req, res) => {
    try {
        const query = 'SELECT * FROM tasks WHERE deleted_at IS NULL';
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No tasks to export' });
        }

        const fields = [
            'id',
            'customer_id',
            'title',
            'description',
            'status',
            'priority',
            'due_date',
            'created_at'
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename=tasks.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export tasks' });
    }
};

// Import customers from CSV
exports.importCustomers = async (req, res) => {
    try {
        const { data } = req.body; // Array of customer objects

        if (!data || !Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        let imported = 0;
        let failed = 0;
        const errors = [];

        for (const customer of data) {
            try {
                const id = require('crypto').randomUUID();
                await pool.query(
                    `INSERT INTO customers (id, account_name, industry, tier, mrr, health_score, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        id,
                        customer.account_name,
                        customer.industry || 'Other',
                        customer.tier || 'Starter',
                        customer.mrr || 0,
                        customer.health_score || 50,
                        customer.status || 'Active'
                    ]
                );
                imported++;
            } catch (err) {
                failed++;
                errors.push({ row: customer, error: err.message });
            }
        }

        res.json({
            message: 'Import completed',
            imported,
            failed,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ error: 'Failed to import customers' });
    }
};

// Bulk delete customers
exports.bulkDeleteCustomers = async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        await pool.query(
            `UPDATE customers SET deleted_at = datetime('now') WHERE id IN (${placeholders})`,
            ids
        );

        res.json({ message: `${ids.length} customers deleted successfully` });
    } catch (err) {
        console.error('Bulk delete error:', err);
        res.status(500).json({ error: 'Failed to delete customers' });
    }
};

// Bulk update customer status
exports.bulkUpdateStatus = async (req, res) => {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'No IDs provided' });
    }

    if (!status) {
        return res.status(400).json({ error: 'Status is required' });
    }

    try {
        const placeholders = ids.map(() => '?').join(',');
        await pool.query(
            `UPDATE customers SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`,
            [status, ...ids]
        );

        res.json({ message: `${ids.length} customers updated successfully` });
    } catch (err) {
        console.error('Bulk update error:', err);
        res.status(500).json({ error: 'Failed to update customers' });
    }
};

// Advanced search
exports.advancedSearch = async (req, res) => {
    const { query: searchQuery, entity, filters } = req.body;

    try {
        let sql = '';
        const params = [];

        if (entity === 'customers') {
            sql = 'SELECT * FROM customers WHERE deleted_at IS NULL';

            if (searchQuery) {
                sql += ' AND (account_name LIKE ? OR industry LIKE ?)';
                params.push(`%${searchQuery}%`, `%${searchQuery}%`);
            }

            if (filters) {
                if (filters.status) {
                    sql += ' AND status = ?';
                    params.push(filters.status);
                }
                if (filters.tier) {
                    sql += ' AND tier = ?';
                    params.push(filters.tier);
                }
                if (filters.minHealth) {
                    sql += ' AND health_score >= ?';
                    params.push(filters.minHealth);
                }
                if (filters.maxHealth) {
                    sql += ' AND health_score <= ?';
                    params.push(filters.maxHealth);
                }
            }
        } else if (entity === 'contacts') {
            sql = 'SELECT * FROM contacts WHERE deleted_at IS NULL';

            if (searchQuery) {
                sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
                params.push(`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`);
            }
        } else if (entity === 'tasks') {
            sql = 'SELECT * FROM tasks WHERE deleted_at IS NULL';

            if (searchQuery) {
                sql += ' AND (title LIKE ? OR description LIKE ?)';
                params.push(`%${searchQuery}%`, `%${searchQuery}%`);
            }

            if (filters) {
                if (filters.status) {
                    sql += ' AND status = ?';
                    params.push(filters.status);
                }
                if (filters.priority) {
                    sql += ' AND priority = ?';
                    params.push(filters.priority);
                }
            }
        }

        const result = await pool.query(sql, params);
        res.json({ data: result.rows, count: result.rows.length });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Search failed' });
    }
};
