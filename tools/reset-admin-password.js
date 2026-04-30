const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
    const password = 'admin123';

    try {
        console.log('🔐 Generating fresh hash for password:', password);
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        console.log('📝 Updating user...');
        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ? WHERE email = ?',
            [passwordHash, email]
        );

        if (result.affectedRows > 0) {
            console.log(`✅ Password updated successfully!`);

            // Verify immediate comparison
            console.log('🔍 Verifying...');
            const verified = await bcrypt.compare(password, passwordHash);
            console.log(`   Hash verification: ${verified ? 'PASS' : 'FAIL'}`);
        } else {
            console.log(`❌ User ${email} not found!`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
