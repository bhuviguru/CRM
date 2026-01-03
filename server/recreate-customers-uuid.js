const db = require('better-sqlite3')('./sahayak.db');
const { v4: uuidv4 } = require('uuid');

console.log('🔄 Recreating customers with proper UUIDs...\n');

// Delete customers with old ID format
const deleteResult = db.prepare('DELETE FROM customers WHERE id LIKE "cust-%"').run();
console.log(`Deleted ${deleteResult.changes} customers with old ID format\n`);

// Create new customers with proper UUIDs
const customers = [
    { name: 'Alpha Corp', email: 'contact@alpha.com', phone: '+1234567890', industry: 'Technology', tier: 'Enterprise', status: 'At Risk', health_score: 28 },
    { name: 'Beta Ltd', email: 'info@beta.com', phone: '+1234567891', industry: 'Finance', tier: 'Standard', status: 'Active', health_score: 54 },
    { name: 'Gamma Inc', email: 'support@gamma.com', phone: '+1234567892', industry: 'Healthcare', tier: 'Standard', status: 'Active', health_score: 52 },
    { name: 'Delta Systems', email: 'sales@delta.com', phone: '+1234567893', industry: 'Technology', tier: 'Enterprise', status: 'At Risk', health_score: 20 },
    { name: 'Epsilon Enterprises', email: 'hello@epsilon.com', phone: '+1234567894', industry: 'Retail', tier: 'Standard', status: 'Active', health_score: 64 },
    { name: 'Zeta Innovations', email: 'contact@zeta.com', phone: '+1234567895', industry: 'Technology', tier: 'Basic', status: 'Active', health_score: 72 },
    { name: 'Eta Solutions', email: 'info@eta.com', phone: '+1234567896', industry: 'Manufacturing', tier: 'Standard', status: 'Active', health_score: 58 },
    { name: 'Theta Group', email: 'support@theta.com', phone: '+1234567897', industry: 'Finance', tier: 'Enterprise', status: 'Active', health_score: 81 },
    { name: 'Iota Tech', email: 'hello@iota.com', phone: '+1234567898', industry: 'Technology', tier: 'Basic', status: 'At Risk', health_score: 16 },
    { name: 'Kappa Industries', email: 'contact@kappa.com', phone: '+1234567899', industry: 'Healthcare', tier: 'Standard', status: 'Active', health_score: 69 }
];

const insertStmt = db.prepare(`
    INSERT INTO customers (id, account_name, email, phone, industry, tier, status, health_score, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const transaction = db.transaction(() => {
    customers.forEach(customer => {
        const id = uuidv4();
        console.log(`Creating: ${customer.name} with ID ${id}`);
        insertStmt.run(
            id,
            customer.name,
            customer.email,
            customer.phone,
            customer.industry,
            customer.tier,
            customer.status,
            customer.health_score
        );
    });
});

transaction();

console.log('\n✅ All customers recreated with UUID format!');
console.log(`Total customers now: ${db.prepare('SELECT COUNT(*) as count FROM customers').get().count}`);

db.close();
