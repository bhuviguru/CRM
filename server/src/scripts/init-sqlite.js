const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');
const path = require('path');

// Create SQLite database
const dbPath = path.join(__dirname, '../../sahayak.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🔧 Initializing SQLite database with sample data...');

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        account_name TEXT NOT NULL,
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
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        due_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

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
    );
`);

// Insert admin user
const hashedPassword = bcrypt.hashSync('admin123', 10);
try {
    db.prepare(
        `
        INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
        VALUES (?, ?, ?, ?, ?)
    `
    ).run('admin-user-id', 'admin@sahayakcrm.com', hashedPassword, 'Admin User', 'admin');
    console.log('✅ Admin user created');
} catch (err) {
    console.log('ℹ️  Admin user already exists');
}

// Insert sample customers
const sampleCustomers = [
    {
        id: 'cust-1',
        name: 'Acme Corp',
        industry: 'Technology',
        tier: 'Enterprise',
        mrr: 5000,
        health_score: 85,
        status: 'Active'
    },
    {
        id: 'cust-2',
        name: 'TechStart Inc',
        industry: 'SaaS',
        tier: 'Growth',
        mrr: 2500,
        health_score: 72,
        status: 'Active'
    },
    {
        id: 'cust-3',
        name: 'Global Solutions',
        industry: 'Consulting',
        tier: 'Enterprise',
        mrr: 8000,
        health_score: 45,
        status: 'At Risk'
    }
];

sampleCustomers.forEach(customer => {
    try {
        db.prepare(
            `
            INSERT OR IGNORE INTO customers (id, account_name, industry, tier, mrr, health_score, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        ).run(
            customer.id,
            customer.name,
            customer.industry,
            customer.tier,
            customer.mrr,
            customer.health_score,
            customer.status
        );
    } catch (err) {
        // Ignore duplicates
    }
});
console.log('✅ Sample customers created');

// Insert sample tasks
const sampleTasks = [
    {
        id: 'task-1',
        customer_id: 'cust-1',
        title: 'Quarterly Business Review',
        status: 'open',
        priority: 'high'
    },
    {
        id: 'task-2',
        customer_id: 'cust-2',
        title: 'Onboarding Call',
        status: 'in_progress',
        priority: 'medium'
    },
    {
        id: 'task-3',
        customer_id: 'cust-3',
        title: 'Churn Prevention Strategy',
        status: 'open',
        priority: 'urgent'
    }
];

sampleTasks.forEach(task => {
    try {
        db.prepare(
            `
            INSERT OR IGNORE INTO tasks (id, customer_id, title, status, priority)
            VALUES (?, ?, ?, ?, ?)
        `
        ).run(task.id, task.customer_id, task.title, task.status, task.priority);
    } catch (err) {
        // Ignore duplicates
    }
});
console.log('✅ Sample tasks created');

console.log('🎉 SQLite database initialized successfully!');
console.log('📊 Database location:', dbPath);

db.close();
