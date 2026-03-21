/**
 * Fix password hashes in the database
 * Run with: node scripts/fix-passwords.js
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
    console.log('🔐 Generating new password hash...');

    // Generate a fresh bcrypt hash
    const password = 'admin123';
    const saltRounds = 10;
    const newHash = await bcrypt.hash(password, saltRounds);

    console.log('✅ New hash generated:', newHash);

    // Verify it works
    const isValid = await bcrypt.compare(password, newHash);
    console.log('✅ Hash verification:', isValid ? 'PASSED' : 'FAILED');

    if (!isValid) {
        console.error('❌ Hash verification failed! Something is wrong with bcrypt.');
        process.exit(1);
    }

    // Connect to database
    console.log('\n🔌 Connecting to MySQL...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: '',
        database: 'rentals_dashboard',
    });

    console.log('✅ Connected!\n');

    // Update all users with the new hash
    console.log('📝 Updating all users with new password hash...');
    const [result] = await connection.execute(
        'UPDATE users SET password_hash = ?',
        [newHash]
    );

    console.log(`✅ Updated ${result.affectedRows} users`);

    // Verify one user
    const [users] = await connection.execute('SELECT email, password_hash FROM users LIMIT 1');
    if (users.length > 0) {
        const testUser = users[0];
        const testValid = await bcrypt.compare(password, testUser.password_hash);
        console.log(`\n🧪 Testing user ${testUser.email}:`);
        console.log(`   Password 'admin123' valid: ${testValid ? '✅ YES' : '❌ NO'}`);
    }

    await connection.end();
    console.log('\n🎉 Done! All users now have password: admin123');
}

main().catch(console.error);
