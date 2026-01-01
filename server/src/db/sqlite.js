const Database = require('better-sqlite3');
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, '../../sahayak.db');
console.log('📦 SQLite database path:', dbPath);

let db;
try {
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    console.log('✅ SQLite database connected');
} catch (error) {
    console.error('❌ Failed to connect to SQLite:', error);
    throw error;
}

// Convert PostgreSQL query to SQLite
function convertQuery(text, params) {
    let query = text;

    // Replace $1, $2, etc. with ?
    query = query.replace(/\$\d+/g, '?');

    // Replace CURRENT_TIMESTAMP with datetime('now')
    query = query.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");

    // Remove NULLS LAST/FIRST (SQLite doesn't support it)
    query = query.replace(/\s+NULLS\s+(LAST|FIRST)/gi, '');

    // Remove RETURNING clause
    const hasReturning = /RETURNING\s+\*/i.test(query);
    query = query.replace(/RETURNING\s+\*/i, '');

    return { query, hasReturning };
}

// Wrapper to make it work like pg pool
const pool = {
    query: async (text, params = []) => {
        try {
            const { query, hasReturning } = convertQuery(text, params);

            // Handle SELECT queries
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                const stmt = db.prepare(query);
                const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
                return { rows };
            }

            // Handle INSERT/UPDATE/DELETE
            const stmt = db.prepare(query);
            const result = params.length > 0 ? stmt.run(...params) : stmt.run();

            // If RETURNING was requested, fetch the inserted/updated row
            if (hasReturning && result.lastInsertRowid) {
                const tableName = getTableName(query);
                const selectStmt = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
                const rows = selectStmt.all(result.lastInsertRowid);
                return { rows };
            }

            return { rows: [], rowCount: result.changes };
        } catch (error) {
            console.error('❌ Database query error:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        }
    }
};

// Helper to extract table name
function getTableName(query) {
    const match = query.match(/(?:INTO|UPDATE|FROM)\s+(\w+)/i);
    return match ? match[1] : 'unknown';
}

// Initialize tables
const initTables = () => {
    try {
        // Users table
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                last_login TEXT,
                github_id TEXT UNIQUE,
                auth_provider TEXT DEFAULT 'local',
                profile_picture TEXT
            )
        `);

        // Customers table
        db.exec(`
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                account_name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                industry TEXT,
                tier TEXT,
                mrr REAL,
                arr REAL,
                status TEXT DEFAULT 'Active',
                health_score INTEGER DEFAULT 100,
                renewal_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                version INTEGER DEFAULT 1
            )
        `);

        // Tasks table
        db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                customer_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'open',
                priority TEXT DEFAULT 'medium',
                assigned_to TEXT,
                due_date TEXT,
                created_by TEXT,
                completed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);

        // Contacts table
        db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                title TEXT,
                is_primary INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                deleted_at TEXT,
                FOREIGN KEY (customer_id) REFERENCES customers(id)
            )
        `);

            CREATE TABLE IF NOT EXISTS notifications(
            id TEXT PRIMARY KEY,
            user_id TEXT,
            type TEXT,
            title TEXT,
            message TEXT,
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
            `);

        // Audit Logs table
        db.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                action TEXT NOT NULL,
                user_id TEXT,
                changes TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // --- SCHEMA MIGRATION: Auto-add missing columns ---
        const addColumnIfNotExists = (table, column, definition) => {
            try {
                const columns = db.pragma(`table_info(${ table })`);
                const exists = columns.some(c => c.name === column);
                if (!exists) {
                    console.log(`🔧 Migrating: Adding ${ column } to ${ table }...`);
                    db.exec(`ALTER TABLE ${ table } ADD COLUMN ${ column } ${ definition } `);
                }
            } catch (err) {
                console.error(`❌ Migration failed for ${ table }.${ column }: `, err.message);
            }
        };

        // Ensure users table has OAuth columns (for existing databases)
        addColumnIfNotExists('users', 'github_id', 'TEXT UNIQUE');
        addColumnIfNotExists('users', 'auth_provider', "TEXT DEFAULT 'local'");
        addColumnIfNotExists('users', 'profile_picture', 'TEXT');

        console.log('✅ SQLite tables initialized and schema verified');
    } catch (error) {
        console.error('❌ Failed to initialize tables:', error);
    }
};

// Initialize on load
initTables();

module.exports = { pool, db };
