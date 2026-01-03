const { pool } = require('../db');
// const { auditLog, softDelete } = require('../db/helpers');

/**
 * Get all contacts
 * @route GET /api/contacts
 */
exports.getAllContacts = async (req, res) => {
    try {
        const { customer_id, search } = req.query;

        let query = 'SELECT * FROM contacts WHERE deleted_at IS NULL';
        const params = [];

        if (customer_id) {
            query += ` AND customer_id = ?`;
            params.push(customer_id);
        }

        if (search) {
            query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        query += ' ORDER BY created_at DESC';

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            error: 'Failed to fetch contacts',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Create contact
 * @route POST /api/contacts
 */
exports.createContact = async (req, res) => {
    try {
        const { customer_id, name, email, phone, title, is_primary } = req.body;

        // Validation
        if (!customer_id || !name) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'customer_id and name are required'
            });
        }

        const id = require('crypto').randomUUID();
        await pool.query(
            `INSERT INTO contacts (id, customer_id, name, email, phone, title, is_primary)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, customer_id, name, email, phone, title, is_primary || 0]
        );

        const result = await pool.query('SELECT * FROM contacts WHERE id = ?', [id]);
        const contact = result.rows[0];

        res.status(201).json(contact);
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            error: 'Failed to create contact',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Update contact
 * @route PUT /api/contacts/:id
 */
exports.updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['name', 'email', 'phone', 'title', 'is_primary'];
        const updateFields = [];
        const values = [];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        updateFields.push(`updated_at = datetime('now')`);
        values.push(id);

        const query = `
            UPDATE contacts
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `;

        await pool.query(query, values);

        const result = await pool.query('SELECT * FROM contacts WHERE id = ?', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({
            error: 'Failed to update contact',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Delete contact
 * @route DELETE /api/contacts/:id
 */
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query("UPDATE contacts SET deleted_at = datetime('now') WHERE id = ?", [id]);

        res.json({ message: 'Contact deleted successfully', id });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            error: 'Failed to delete contact',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
