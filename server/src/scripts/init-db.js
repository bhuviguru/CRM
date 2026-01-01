const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const initDb = async () => {
    try {
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema migration...');
        await pool.query(schema);
        console.log('Database initialized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
};

initDb();
