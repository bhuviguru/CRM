/**
 * @fileoverview Customer management controller
 * @module controllers/customers
 * @requires ../db
 * @requires ../db/helpers
 */

const { pool } = require('../db');
const { auditLog, softDelete, checkVersion } = require('../db/helpers');

// Constants
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Get all active customers with filtering and pagination
 * @async
 * @function getAllCustomers
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.page=1] - Page number
 * @param {number} [req.query.limit=100] - Items per page
 * @param {string} [req.query.status] - Filter by status
 * @param {string} [req.query.tier] - Filter by tier
 * @param {number} [req.query.minHealth] - Minimum health score
 * @param {number} [req.query.maxHealth] - Maximum health score
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with customers data
 * @throws {Error} 500 - Internal server error
 *
 * @example
 * GET /api/customers?page=1&limit=50&status=Active&minHealth=70
 * Response: {
 *   data: [...],
 *   pagination: { page: 1, limit: 50, total: 150, totalPages: 3 }
 * }
 */
exports.getAllCustomers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || DEFAULT_PAGE;
        const limit = Math.min(parseInt(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);
        const offset = (page - 1) * limit;

        // Build WHERE clause
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        const paramIndex = 1;

        if (req.query.status) {
            conditions.push(`status = ?`);
            params.push(req.query.status);
        }

        if (req.query.tier) {
            conditions.push(`tier = ?`);
            params.push(req.query.tier);
        }

        if (req.query.minHealth) {
            conditions.push(`health_score >= ?`);
            params.push(parseInt(req.query.minHealth));
        }

        if (req.query.maxHealth) {
            conditions.push(`health_score <= ?`);
            params.push(parseInt(req.query.maxHealth));
        }

        const whereClause = conditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM customers WHERE ${whereClause}`;
        const countResult = await pool.query(countQuery, params);
        const total = countResult.rows[0].total;

        // Get paginated data
        const dataQuery = `
            SELECT * FROM customers 
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `;
        const result = await pool.query(dataQuery, [...params, limit, offset]);

        res.json({
            data: result.rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
};

/**
 * Create a new customer
 * @async
 * @function createCustomer
 * @param {Object} req - Express request object
 * @param {Object} req.body - Customer data
 * @param {string} req.body.account_name - Customer account name (required)
 * @param {string} [req.body.industry] - Industry type
 * @param {string} [req.body.tier] - Customer tier
 * @param {number} [req.body.mrr] - Monthly recurring revenue
 * @param {number} [req.body.health_score] - Health score (0-100)
 * @param {string} [req.body.status] - Customer status
 * @param {Object} res - Express response object
 * @returns {Promise<void>} JSON response with created customer
 * @throws {Error} 400 - Validation error
 * @throws {Error} 500 - Internal server error
 *
 * @example
 * POST /api/customers
 * Body: {
 *   account_name: "Acme Corp",
 *   industry: "Technology",
 *   tier: "Enterprise",
 *   mrr: 5000
 * }
 */
exports.createCustomer = async (req, res) => {
    const { account_name, industry, tier, mrr, health_score, status } = req.body;

    // Validation
    if (!account_name) {
        return res.status(400).json({
            error: 'Validation failed',
            message: 'account_name is required'
        });
    }

    try {
        const id = require('crypto').randomUUID();
        const userId = req.user?.id;

        await pool.query(
            `INSERT INTO customers (id, account_name, industry, tier, mrr, health_score, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                account_name,
                industry || 'Other',
                tier || 'Starter',
                mrr || 0,
                health_score || 50,
                status || 'Active'
            ]
        );

        const result = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
        const customer = result.rows[0];

        // Audit log
        if (userId) {
            await auditLog('customer', id, 'created', userId, { after: customer }, req);
        }

        res.status(201).json(customer);
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(500).json({ error: 'Failed to create customer' });
    }
};

// ... (rest of the file with similar JSDoc comments)
