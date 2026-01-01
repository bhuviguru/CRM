const { pool } = require('../db');

/**
 * Email Templates Controller
 */

// Get all email templates
exports.getAllTemplates = async (req, res) => {
    try {
        const query =
            'SELECT * FROM email_templates WHERE deleted_at IS NULL ORDER BY created_at DESC';
        const result = await pool.query(query);
        res.json({ data: result.rows });
    } catch (err) {
        console.error('Error fetching templates:', err);
        res.status(500).json({ error: 'Failed to fetch email templates' });
    }
};

// Get template by ID
exports.getTemplateById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT * FROM email_templates WHERE id = ? AND deleted_at IS NULL',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching template:', err);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
};

// Create email template
exports.createTemplate = async (req, res) => {
    const { name, subject, body, category, variables } = req.body;

    if (!name || !subject || !body) {
        return res.status(400).json({ error: 'Name, subject, and body are required' });
    }

    try {
        const id = require('crypto').randomUUID();
        await pool.query(
            `INSERT INTO email_templates (id, name, subject, body, category, variables)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, name, subject, body, category || 'general', JSON.stringify(variables || [])]
        );

        const result = await pool.query('SELECT * FROM email_templates WHERE id = ?', [id]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating template:', err);
        res.status(500).json({ error: 'Failed to create template' });
    }
};

// Update email template
exports.updateTemplate = async (req, res) => {
    const { id } = req.params;
    const { name, subject, body, category, variables } = req.body;

    try {
        const updates = [];
        const values = [];

        if (name) {
            updates.push('name = ?');
            values.push(name);
        }
        if (subject) {
            updates.push('subject = ?');
            values.push(subject);
        }
        if (body) {
            updates.push('body = ?');
            values.push(body);
        }
        if (category) {
            updates.push('category = ?');
            values.push(category);
        }
        if (variables) {
            updates.push('variables = ?');
            values.push(JSON.stringify(variables));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No updates provided' });
        }

        updates.push("updated_at = datetime('now')");
        values.push(id);

        await pool.query(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`, values);

        const result = await pool.query('SELECT * FROM email_templates WHERE id = ?', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating template:', err);
        res.status(500).json({ error: 'Failed to update template' });
    }
};

// Delete email template
exports.deleteTemplate = async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query("UPDATE email_templates SET deleted_at = datetime('now') WHERE id = ?", [
            id
        ]);

        res.json({ message: 'Template deleted successfully' });
    } catch (err) {
        console.error('Error deleting template:', err);
        res.status(500).json({ error: 'Failed to delete template' });
    }
};

// Send email using template
exports.sendTemplateEmail = async (req, res) => {
    const { template_id, to, variables } = req.body;

    if (!template_id || !to) {
        return res.status(400).json({ error: 'Template ID and recipient email are required' });
    }

    try {
        // Get template
        const templateResult = await pool.query(
            'SELECT * FROM email_templates WHERE id = ? AND deleted_at IS NULL',
            [template_id]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const template = templateResult.rows[0];

        // Replace variables in subject and body
        let subject = template.subject;
        let body = template.body;

        if (variables) {
            Object.keys(variables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                subject = subject.replace(regex, variables[key]);
                body = body.replace(regex, variables[key]);
            });
        }

        // Send email (using existing email service)
        const emailService = require('../services/email');
        await emailService.sendEmail({
            to,
            subject,
            html: body
        });

        res.json({ message: 'Email sent successfully', subject, to });
    } catch (err) {
        console.error('Error sending template email:', err);
        res.status(500).json({ error: 'Failed to send email' });
    }
};
