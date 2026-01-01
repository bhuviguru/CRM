const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'sahayak.db');
const db = new Database(dbPath);

console.log('🔧 Adding GitHub OAuth columns to users table...\n');

try {
    // Check if github_id column exists
    const columns = db.prepare('PRAGMA table_info(users)').all();
    const hasGithubId = columns.some(col => col.name === 'github_id');
    const hasAuthProvider = columns.some(col => col.name === 'auth_provider');
    const hasProfilePicture = columns.some(col => col.name === 'profile_picture');

    if (!hasGithubId) {
        db.exec('ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE');
        console.log('✅ Added github_id column (TEXT, UNIQUE, NULLABLE)');
    } else {
        console.log('ℹ️  github_id column already exists');
    }

    if (!hasAuthProvider) {
        db.exec("ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'local'");
        console.log('✅ Added auth_provider column (TEXT, DEFAULT \'local\')');
    } else {
        console.log('ℹ️  auth_provider column already exists');
    }

    if (!hasProfilePicture) {
        db.exec('ALTER TABLE users ADD COLUMN profile_picture TEXT');
        console.log('✅ Added profile_picture column (TEXT, NULLABLE)');
    } else {
        console.log('ℹ️  profile_picture column already exists');
    }

    // Create index on github_id for faster lookups
    try {
        db.exec('CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id)');
        console.log('✅ Created index on github_id');
    } catch (error) {
        if (!error.message.includes('already exists')) {
            console.log('⚠️  Index creation skipped:', error.message);
        }
    }

    console.log('\n🎉 Database migration complete!');
    console.log('\n📊 Updated users table schema:');

    const updatedColumns = db.prepare('PRAGMA table_info(users)').all();
    updatedColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type}${col.notnull ? ', NOT NULL' : ''}${col.dflt_value ? ', DEFAULT ' + col.dflt_value : ''})`);
    });

} catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
} finally {
    db.close();
}
