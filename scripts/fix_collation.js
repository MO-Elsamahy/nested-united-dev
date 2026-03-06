const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function fixCollation() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard',
    };

    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected.');

        // 1. Get current collation of browser_accounts.id
        const [rows] = await connection.query(`
            SELECT COLLATION_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'browser_accounts' AND COLUMN_NAME = 'id'
        `, [config.database]);

        const targetCollation = rows[0]?.COLLATION_NAME || 'utf8mb4_unicode_ci';
        const targetCharset = targetCollation.split('_')[0];

        console.log(`🎯 Target Collation detected from browser_accounts: ${targetCollation}`);

        // 2. Fix platform_messages table and columns
        console.log(`🔧 Altering platform_messages to ${targetCollation}...`);
        await connection.query(`ALTER TABLE platform_messages CONVERT TO CHARACTER SET ${targetCharset} COLLATE ${targetCollation}`);

        // 3. Fix session_health_logs table and columns
        console.log(`🔧 Altering session_health_logs to ${targetCollation}...`);
        await connection.query(`ALTER TABLE session_health_logs CONVERT TO CHARACTER SET ${targetCharset} COLLATE ${targetCollation}`);

        console.log('✅ Collation Fix Finalized Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Fatal Error:', err.message);
        process.exit(1);
    }
}

fixCollation();
