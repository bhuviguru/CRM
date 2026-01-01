const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'sahayak.db');
console.log(`Open database at: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file not found!');
    process.exit(1);
}

const db = new Database(dbPath);

function addColumn(tableName, colName, colDef) {
    try {
        console.log(`Attempting to add column ${colName} to ${tableName}...`);
        db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colDef}`).run();
        console.log(`✅ Successfully added column: ${colName}`);
    } catch (error) {
        if (error.message.includes('duplicate column name')) {
            console.log(`ℹ️  Column ${colName} already exists.`);
        } else {
            console.error(`❌ Failed to add column ${colName}:`, error.message);
        }
    }
}

try {
    // 1. Add github_id
    addColumn('users', 'github_id', 'TEXT UNIQUE');

    // 2. Add auth_provider
    addColumn('users', 'auth_provider', "TEXT DEFAULT 'local'");

    // 3. Add profile_picture
    addColumn('users', 'profile_picture', 'TEXT');

    // 4. Verify
    const columns = db.prepare('PRAGMA table_info(users)').all();
    console.log('\nCurrent Schema for users table:');
    columns.forEach(col => console.log(` - ${col.name} (${col.type})`));

} catch (err) {
    console.error('Fatal error during migration:', err);
} finally {
    db.close();
}
