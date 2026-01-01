// Complete database reinitialization with correct schema
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../sahayak.db');
console.log('🔄 Reinitializing database with correct schema...\n');

// Delete old database
const fs = require('fs');
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Old database deleted');
}

const db = new Database(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

console.log('Creating tables...\n');

// Users table
db.exec(`
    CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`);
console.log('✅ Users table created');

// Customers table with ALL needed columns
db.exec(`
    CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        account_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        industry TEXT,
        tier TEXT,
        mrr REAL,
        arr REAL,
        status TEXT DEFAULT 'active',
        health_score INTEGER DEFAULT 50,
        primary_contact_name TEXT,
        primary_contact_email TEXT,
        renewal_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        version INTEGER DEFAULT 1
    )
`);
console.log('✅ Customers table created (with email, phone)');

// Tasks table with ALL needed columns
db.exec(`
    CREATE TABLE tasks (
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
console.log('✅ Tasks table created');

// Contacts table
db.exec(`
    CREATE TABLE contacts (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT,
        is_primary INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
`);
console.log('✅ Contacts table created');

console.log('\nInserting sample data...\n');

// Insert admin user
const adminId = require('crypto').randomUUID();
const hashedPassword = bcrypt.hashSync('admin123', 10);
db.prepare(`
    INSERT INTO users (id, email, password, name, role)
    VALUES (?, ?, ?, ?, ?)
`).run(adminId, 'admin@sahayakcrm.com', hashedPassword, 'Admin User', 'admin');
console.log('✅ Admin user created (admin@sahayakcrm.com / admin123)');

// Insert sample customers
const customers = [
    {
        id: require('crypto').randomUUID(),
        account_name: 'Acme Corp',
        email: 'contact@acmecorp.com',
        phone: '+15550001',
        industry: 'Technology',
        tier: 'Enterprise',
        mrr: 5000,
        status: 'active',
        health_score: 85
    },
    {
        id: require('crypto').randomUUID(),
        account_name: 'TechStart Inc',
        email: 'hello@techstart.io',
        phone: '+15550002',
        industry: 'SaaS',
        tier: 'Standard',
        mrr: 2000,
        status: 'active',
        health_score: 72
    },
    {
        id: require('crypto').randomUUID(),
        account_name: 'Global Solutions',
        email: 'info@globalsolutions.com',
        phone: '+15550003',
        industry: 'Consulting',
        tier: 'Standard',
        mrr: 1500,
        status: 'at_risk',
        health_score: 45
    }
];

const customerStmt = db.prepare(`
    INSERT INTO customers (
        id, account_name, email, phone, industry, tier, mrr, status, health_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

customers.forEach(c => {
    customerStmt.run(c.id, c.account_name, c.email, c.phone, c.industry, c.tier, c.mrr, c.status, c.health_score);
});
console.log(`✅ ${customers.length} sample customers created`);

// Insert sample tasks
const tasks = [
    {
        id: require('crypto').randomUUID(),
        customer_id: customers[0].id,
        title: 'Quarterly Business Review',
        description: 'Schedule QBR with Acme Corp',
        status: 'open',
        priority: 'high',
        assigned_to: 'admin',
        due_date: '2026-01-15',
        created_by: 'admin'
    },
    {
        id: require('crypto').randomUUID(),
        customer_id: customers[1].id,
        title: 'Follow-up Call',
        description: 'Check on product adoption',
        status: 'in_progress',
        priority: 'medium',
        assigned_to: 'admin',
        due_date: '2026-01-10',
        created_by: 'admin'
    },
    {
        id: require('crypto').randomUUID(),
        customer_id: customers[2].id,
        title: 'Churn Prevention',
        description: 'Urgent: Address concerns',
        status: 'open',
        priority: 'urgent',
        assigned_to: 'admin',
        due_date: '2026-01-05',
        created_by: 'admin'
    }
];

const taskStmt = db.prepare(`
    INSERT INTO tasks (
        id, customer_id, title, description, status, priority, assigned_to, due_date, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

tasks.forEach(t => {
    taskStmt.run(t.id, t.customer_id, t.title, t.description, t.status, t.priority, t.assigned_to, t.due_date, t.created_by);
});
console.log(`✅ ${tasks.length} sample tasks created`);

db.close();

console.log('\n✅ Database reinitialized successfully!');
console.log('\n📊 Summary:');
console.log(`   - Users: 1 (admin)`);
console.log(`   - Customers: ${customers.length}`);
console.log(`   - Tasks: ${tasks.length}`);
console.log('\n🔐 Login: admin@sahayakcrm.com / admin123');
