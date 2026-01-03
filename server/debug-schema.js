const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'sahayak.db');
const db = new Database(dbPath);

console.log('Connected to database at', dbPath);

const schema = db.prepare("PRAGMA table_info(customers)").all();
console.log('Customers table schema:', schema);

const rows = db.prepare("SELECT * FROM customers LIMIT 1").all();
console.log('First customer row:', rows);
