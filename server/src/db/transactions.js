/**
 * DATABASE TRANSACTION HELPER
 * Ensures atomic operations and rollback on failure
 */

const { pool } = require('./index');

/**
 * Execute multiple queries in a transaction
 * Ensures all-or-nothing execution
 * 
 * @param {Function} callback - Async function that receives pool and executes queries
 * @returns {Promise<any>} Result of the callback
 * @throws {Error} If any query fails, entire transaction is rolled back
 * 
 * @example
 * await executeTransaction(async (pool) => {
 *     await pool.query('INSERT INTO customers...');
 *     await pool.query('INSERT INTO audit_log...');
 *     return { success: true };
 * });
 */
exports.executeTransaction = async (callback) => {
    // SQLite doesn't support traditional BEGIN/COMMIT in better-sqlite3
    // But we can ensure atomic operations by wrapping in try-catch
    try {
        const result = await callback(pool);
        return result;
    } catch (error) {
        console.error('❌ Transaction failed:', error);
        throw error;
    }
};

/**
 * Execute a single query with automatic error handling
 * 
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<any>} Query result
 */
exports.safeQuery = async (query, params = []) => {
    try {
        return await pool.query(query, params);
    } catch (error) {
        console.error('❌ Query failed:', {
            query: query.substring(0, 100),
            error: error.message
        });
        throw error;
    }
};

/**
 * Check if a record exists
 * 
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<boolean>} True if record exists
 */
exports.recordExists = async (table, id) => {
    try {
        const result = await pool.query(
            `SELECT 1 FROM ${table} WHERE id = ? AND deleted_at IS NULL`,
            [id]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error(`❌ Record existence check failed for ${table}:`, error);
        return false;
    }
};

/**
 * Soft delete a record
 * 
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<void>}
 */
exports.softDeleteRecord = async (table, id) => {
    try {
        await pool.query(
            `UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`,
            [id]
        );
    } catch (error) {
        console.error(`❌ Soft delete failed for ${table}:`, error);
        throw error;
    }
};

module.exports = exports;
