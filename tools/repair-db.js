const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function repairDatabase() {
    console.log('🛡️ Starting Critical Database Repair...');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    };

    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to Database.');

        // 1. Check/Add columns to platform_messages
        console.log('📦 Checking platform_messages table structure...');
        
        const requiredColumns = [
            { name: 'platform_account_id', type: 'CHAR(36) NOT NULL AFTER id' },
            { name: 'platform', type: "ENUM('airbnb', 'gathern') NOT NULL AFTER platform_account_id" },
            { name: 'thread_id', type: 'VARCHAR(255) NOT NULL AFTER platform' },
            { name: 'guest_name', type: 'VARCHAR(255) AFTER thread_id' },
            { name: 'message_text', type: 'TEXT AFTER guest_name' },
            { name: 'sent_at', type: 'DATETIME AFTER message_text' },
            { name: 'is_read', type: 'BOOLEAN DEFAULT FALSE AFTER sent_at' },
            { name: 'raw_data', type: 'JSON AFTER is_read' },
            { name: 'created_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP AFTER raw_data' }
        ];

        for (const col of requiredColumns) {
            try {
                // Check if column exists
                const [cols] = await connection.query(`SHOW COLUMNS FROM platform_messages LIKE '${col.name}'`);
                if (cols.length === 0) {
                    console.log(`   ➕ Adding missing column: ${col.name}...`);
                    await connection.query(`ALTER TABLE platform_messages ADD COLUMN ${col.name} ${col.type}`);
                    console.log(`   ✅ Success.`);
                } else {
                    console.log(`   ⏭️ Column ${col.name} already exists.`);
                }
            } catch (_err) {
                console.log(`   ⚠️ Failed to process column ${col.name}: ${_err.message}`);
            }
        }

        // 2. Ensure platform_account_id exists in browser_accounts (just in case)
        console.log('📦 Checking browser_accounts table structure...');
        try {
            const [cols] = await connection.query(`SHOW COLUMNS FROM browser_accounts LIKE 'last_sync_at'`);
            if (cols.length === 0) {
                console.log(`   ➕ Adding missing column: last_sync_at...`);
                await connection.query(`ALTER TABLE browser_accounts ADD COLUMN last_sync_at DATETIME NULL`);
                console.log(`   ✅ Success.`);
            }
        } catch (_err) { /* ignore */ }

        console.log('🎉 Database Repair Finalized Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Fatal Error during repair:', err.message);
        process.exit(1);
    }
}

repairDatabase();
