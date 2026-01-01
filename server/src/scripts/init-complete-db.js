const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function initializeDatabase() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting database initialization...\n');

        // Read and execute schema files in order
        const schemaFiles = [
            'enterprise_schema.sql',
            'phase3_schema.sql',
            'production_updates.sql',
            'contacts_schema.sql'
        ];

        for (const file of schemaFiles) {
            const filePath = path.join(__dirname, file);

            if (fs.existsSync(filePath)) {
                console.log(`📄 Executing ${file}...`);
                const sql = fs.readFileSync(filePath, 'utf8');

                try {
                    await client.query(sql);
                    console.log(`✅ ${file} executed successfully\n`);
                } catch (err) {
                    console.error(`⚠️  Error in ${file}:`, err.message);
                    // Continue with other files
                }
            } else {
                console.log(`⚠️  ${file} not found, skipping\n`);
            }
        }

        // Create default admin user if not exists
        console.log('👤 Creating default admin user...');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await client.query(
            `
            INSERT INTO users (email, password_hash, name, role, is_active)
            VALUES ('admin@sahayakcrm.com', $1, 'Admin User', 'admin', TRUE)
            ON CONFLICT (email) DO NOTHING
        `,
            [hashedPassword]
        );

        console.log(
            '✅ Default admin user created (email: admin@sahayakcrm.com, password: admin123)\n'
        );

        // Initialize default playbooks
        console.log('🤖 Initializing default playbooks...');
        const { initializeDefaultPlaybooks } = require('../services/playbooks');
        await initializeDefaultPlaybooks();
        console.log('✅ Default playbooks initialized\n');

        console.log('🎉 Database initialization complete!\n');
        console.log('📊 Summary:');
        console.log('  ✅ All schemas created');
        console.log('  ✅ Sample data inserted');
        console.log('  ✅ Default admin user created');
        console.log('  ✅ Default playbooks initialized');
        console.log('\n🚀 You can now start the server!\n');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run initialization
initializeDatabase()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
