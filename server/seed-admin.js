const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'sahayak.db');
const db = new Database(dbPath);

async function seedAdmin() {
    try {
        console.log('🌱 Seeding admin user...');

        const email = 'admin@sahayakcrm.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

        if (user) {
            console.log('ℹ️  Admin user already exists. Updating credentials...');
            db.prepare('UPDATE users SET password_hash = ?, role = ?, is_active = 1 WHERE email = ?').run(hashedPassword, 'admin', email);
        } else {
            console.log('Creating new admin user...');
            const id = require('crypto').randomUUID();
            db.prepare(`
                INSERT INTO users (id, email, password_hash, name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(id, email, hashedPassword, 'Sahayak Admin', 'admin', 1);
        }

        console.log('\n✅ Admin user ready!');
        console.log('📧 Email: admin@sahayakcrm.com');
        console.log('🔑 Password: admin123');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        db.close();
    }
}

seedAdmin();
