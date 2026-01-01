const { pool } = require('./index');

/**
 * Audit logging middleware
 * Captures all mutations with before/after state
 */
const auditLog = async (entityType, entityId, action, userId, changes, req) => {
    try {
        const query = `
            INSERT INTO audit_logs (entity_type, entity_id, action, user_id, changes, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;

        const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';
        const userAgent = req?.get('user-agent') || 'unknown';

        await pool.query(query, [
            entityType,
            entityId,
            action,
            userId || null,
            JSON.stringify(changes),
            ipAddress,
            userAgent
        ]);
    } catch (error) {
        console.error('Audit log failed:', error);
        // Don't throw - audit failure shouldn't block operations
    }
};

/**
 * Soft delete helper
 */
const softDelete = async (table, id) => {
    const query = `
        UPDATE ${table}
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING *
    `;
    return pool.query(query, [id]);
};

/**
 * Restore soft-deleted record
 */
const restore = async (table, id) => {
    const query = `
        UPDATE ${table}
        SET deleted_at = NULL
        WHERE id = $1
        RETURNING *
    `;
    return pool.query(query, [id]);
};

/**
 * Optimistic locking check
 */
const checkVersion = async (table, id, expectedVersion) => {
    const query = `SELECT version FROM ${table} WHERE id = $1`;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Record not found');
    }

    if (result.rows[0].version !== expectedVersion) {
        throw new Error('Version conflict - record was modified by another user');
    }

    return true;
};

/**
 * Increment version on update
 */
const incrementVersion = table => {
    return `${table}.version = ${table}.version + 1`;
};

module.exports = {
    auditLog,
    softDelete,
    restore,
    checkVersion,
    incrementVersion
};
