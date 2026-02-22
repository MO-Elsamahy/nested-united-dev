const mysql = require('mysql2/promise');

async function main() {
    console.log('🔌 Connecting to MySQL...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'rentals_dashboard'
    });

    console.log('✅ Connected!');

    const email = 'admin@rentals.com';
    const passwordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4aOAalWQl.Xa.SK6'; // admin123
    const role = 'super_admin';
    const name = 'Super Admin';

    try {
        // Check if user exists
        const [rows] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);

        if (rows.length > 0) {
            console.log(`⚠️ User ${email} already exists. Updating role to ${role}...`);
            await connection.execute('UPDATE users SET role = ?, password_hash = ? WHERE email = ?', [role, passwordHash, email]);
        } else {
            console.log(`✨ Creating new user ${email}...`);
            await connection.execute(
                'INSERT INTO users (id, email, password_hash, role, name, is_active, created_at) VALUES (UUID(), ?, ?, ?, ?, 1, NOW())',
                [email, passwordHash, role, name]
            );
        }
        console.log(`\n🎉 User ready!\nEmail: ${email}\nPassword: admin123`);
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
