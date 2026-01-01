const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sahayak.db');
const db = new Database(dbPath);

console.log('🔍 Testing Customer Creation\n');

// 1. Check table schema
console.log('1. Checking customers table schema:');
const schema = db.prepare("PRAGMA table_info(customers)").all();
schema.forEach(col => {
    console.log(`   - ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}`);
});

// 2. Check existing customers
console.log('\n2. Existing customers:');
const existing = db.prepare('SELECT id, account_name, health_score, status FROM customers WHERE deleted_at IS NULL').all();
console.log(`   Total: ${existing.length}`);
existing.forEach(c => {
    console.log(`   - ${c.account_name}: ${c.health_score}% health, ${c.status}`);
});

// 3. Test INSERT
console.log('\n3. Testing INSERT:');
try {
    const id = require('crypto').randomUUID();
    const stmt = db.prepare(`
        INSERT INTO customers (
            id, account_name, industry, tier, mrr, status
        ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        id,
        'Test Company Ltd',
        'Technology',
        'Enterprise',
        5000,
        'active'
    );

    console.log(`   ✅ INSERT successful! Row ID: ${result.lastInsertRowid}`);

    // 4. Verify insertion
    const inserted = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    console.log(`   ✅ Verified: ${inserted.account_name}`);

    // 5. Clean up test
    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    console.log(`   ✅ Cleanup complete`);

} catch (error) {
    console.error(`   ❌ INSERT failed:`, error.message);
}

// 6. Check current count
const finalCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL').get();
console.log(`\n4. Final customer count: ${finalCount.count}`);

db.close();
console.log('\n✅ Test complete!');
