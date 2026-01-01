const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sahayak.db');
const db = new Database(dbPath);

console.log('🔍 COMPREHENSIVE DATABASE TEST\n');

// 1. Check customers table schema
console.log('1. CUSTOMERS TABLE SCHEMA:');
const customersSchema = db.prepare("PRAGMA table_info(customers)").all();
customersSchema.forEach(col => {
    console.log(`   ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''}`);
});

// 2. Check tasks table schema
console.log('\n2. TASKS TABLE SCHEMA:');
const tasksSchema = db.prepare("PRAGMA table_info(tasks)").all();
tasksSchema.forEach(col => {
    console.log(`   ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''}`);
});

// 3. Test customer INSERT
console.log('\n3. TESTING CUSTOMER INSERT:');
try {
    const id = require('crypto').randomUUID();
    const stmt = db.prepare(`
        INSERT INTO customers (
            id, account_name, email, phone, industry, tier, mrr, status, health_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        'Test Company',
        'test@test.com',
        '+1234567890',
        'Technology',
        'Standard',
        1000,
        'active',
        99
    );

    console.log('   ✅ Customer INSERT successful!');

    // Verify
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    console.log(`   ✅ Verified: ${customer.account_name}, ${customer.email}, ${customer.phone}`);

    // Cleanup
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    console.log('   ✅ Cleanup complete');
} catch (error) {
    console.error('   ❌ Customer INSERT failed:', error.message);
}

// 4. Test task INSERT
console.log('\n4. TESTING TASK INSERT:');
try {
    const id = require('crypto').randomUUID();
    const stmt = db.prepare(`
        INSERT INTO tasks (
            id, customer_id, title, description, assigned_to, priority, due_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        null,
        'Test Task',
        'Test Description',
        'user123',
        'high',
        '2026-01-15',
        'admin'
    );

    console.log('   ✅ Task INSERT successful!');

    // Verify
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    console.log(`   ✅ Verified: ${task.title}, ${task.priority}`);

    // Cleanup
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    console.log('   ✅ Cleanup complete');
} catch (error) {
    console.error('   ❌ Task INSERT failed:', error.message);
}

// 5. Current data counts
console.log('\n5. CURRENT DATA:');
const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL').get();
const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE deleted_at IS NULL OR deleted_at = ""').get();
console.log(`   Customers: ${customerCount.count}`);
console.log(`   Tasks: ${taskCount.count}`);

db.close();
console.log('\n✅ All tests complete!');
