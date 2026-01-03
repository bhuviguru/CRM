const db = require('better-sqlite3')('./sahayak.db');
const { v4: uuidv4 } = require('uuid');

console.log('🔄 Fixing customer IDs to use proper UUIDs...\n');

// Get all customers with non-UUID IDs
const customers = db.prepare('SELECT * FROM customers WHERE id LIKE "cust-%"').all();

console.log(`Found ${customers.length} customers with old ID format\n`);

// Update each customer with a proper UUID
const updateStmt = db.prepare('UPDATE customers SET id = ? WHERE id = ?');
const updateTasksStmt = db.prepare('UPDATE tasks SET customer_id = ? WHERE customer_id = ?');
const updateContactsStmt = db.prepare('UPDATE contacts SET customer_id = ? WHERE customer_id = ?');

db.transaction(() => {
    customers.forEach(customer => {
        const newId = uuidv4();
        const oldId = customer.id;

        console.log(`Updating: ${oldId} (${customer.account_name}) -> ${newId}`);

        // Update customer ID
        updateStmt.run(newId, oldId);

        // Update related tasks
        updateTasksStmt.run(newId, oldId);

        // Update related contacts
        updateContactsStmt.run(newId, oldId);
    });
})();

console.log('\n✅ All customer IDs updated to UUID format!');

db.close();
