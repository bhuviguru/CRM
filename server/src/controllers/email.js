const nodemailer = require('nodemailer');
const { pool } = require('../db');

// Email transporter (configure with your SMTP)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * Send email
 */
exports.sendEmail = async (req, res) => {
    const { customer_id, template_id, recipient_email, variables, sent_by } = req.body;

    try {
        let subject, body;

        if (template_id) {
            // Load template
            const templateResult = await pool.query('SELECT * FROM email_templates WHERE id = $1', [
                template_id
            ]);

            if (templateResult.rows.length === 0) {
                return res.status(404).json({ error: 'Template not found' });
            }

            const template = templateResult.rows[0];
            subject = template.subject;
            body = template.body;

            // Replace variables
            if (variables) {
                Object.keys(variables).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    subject = subject.replace(regex, variables[key]);
                    body = body.replace(regex, variables[key]);
                });
            }
        } else {
            subject = req.body.subject;
            body = req.body.body;
        }

        // Send email
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || 'noreply@sahayakcrm.com',
            to: recipient_email,
            subject,
            html: body
        });

        // Log email
        await pool.query(
            `
            INSERT INTO email_logs (customer_id, template_id, sent_by, recipient_email, subject, body, status, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7)
        `,
            [
                customer_id,
                template_id,
                sent_by,
                recipient_email,
                subject,
                body,
                JSON.stringify({ messageId: info.messageId })
            ]
        );

        res.json({ message: 'Email sent successfully', messageId: info.messageId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send email' });
    }
};

/**
 * Get email templates
 */
exports.getTemplates = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM email_templates ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
};

/**
 * Create email template
 */
exports.createTemplate = async (req, res) => {
    const { name, subject, body, category, variables, created_by } = req.body;

    try {
        const result = await pool.query(
            `
            INSERT INTO email_templates (name, subject, body, category, variables, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `,
            [name, subject, body, category, JSON.stringify(variables || {}), created_by]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create template' });
    }
};

/**
 * Get email history for customer
 */
exports.getEmailHistory = async (req, res) => {
    const { customerId } = req.params;

    try {
        const result = await pool.query(
            `
            SELECT * FROM email_logs
            WHERE customer_id = $1
            ORDER BY sent_at DESC
            LIMIT 50
        `,
            [customerId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch email history' });
    }
};
