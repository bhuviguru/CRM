// Database connection - PostgreSQL for production, SQLite for tests
require('dotenv').config();
const logger = require('../utils/logger');

// Use SQLite for test environment
if (process.env.NODE_ENV === 'test' || process.env.USE_SQLITE === 'true') {
    console.log('📦 Using SQLite database for tests');
    module.exports = require('./sqlite');
} else {
    // Use PostgreSQL for production
    const { Pool } = require('pg');

    // Create PostgreSQL connection pool
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    });

    // Test connection on startup
    pool.on('connect', () => {
        logger.info('PostgreSQL client connected');
    });

    pool.on('error', err => {
        logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
    });

    // Test initial connection
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            logger.error('Failed to connect to PostgreSQL', { error: err.message });
        } else {
            logger.info('PostgreSQL connection established', { timestamp: res.rows[0].now });
        }
    });

    module.exports = { pool };
}
