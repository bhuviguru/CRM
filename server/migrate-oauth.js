const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sahayak.db');
const db = new Database(dbPath);

console.log('Adding OAuth columns to users table...');

try {
    // Add GitHub ID column
    db.exec('ALTER TABLE users ADD COLUMN github_id VARCHAR(255)');
    console.log('✅ Added github_id column');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  github_id column already exists');
    } else {
        console.error('❌ Error adding github_id:', error.message);
    }
}

try {
    // Add auth provider column
    db.exec("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'");
    console.log('✅ Added auth_provider column');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  auth_provider column already exists');
    } else {
        console.error('❌ Error adding auth_provider:', error.message);
    }
}

try {
    // Add profile picture column
    db.exec('ALTER TABLE users ADD COLUMN profile_picture TEXT');
    console.log('✅ Added profile_picture column');
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️  profile_picture column already exists');
    } else {
        console.error('❌ Error adding profile_picture:', error.message);
    }
}

db.close();
console.log('\n🎉 Database migration complete!');
