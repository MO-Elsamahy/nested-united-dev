const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
    console.log('🚀 Starting Smart Database Migration...');

    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard',
        multipleStatements: true
    };

    let connection;

    try {
        connection = await mysql.createConnection(config);
        console.log('✅ Connected.');

        // 1. Create Tables
        const tablesSql = `
          CREATE TABLE IF NOT EXISTS platform_messages (
            id CHAR(36) PRIMARY KEY,
            platform_account_id CHAR(36) NOT NULL,
            platform ENUM('airbnb', 'gathern') NOT NULL,
            thread_id VARCHAR(255) NOT NULL,
            guest_name VARCHAR(255),
            message_text TEXT,
            sent_at DATETIME,
            is_read BOOLEAN DEFAULT FALSE,
            raw_data JSON,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_msg (thread_id, sent_at, platform),
            INDEX idx_pm_account (platform_account_id),
            INDEX idx_pm_read (is_read)
          );

          CREATE TABLE IF NOT EXISTS session_health_logs (
            id CHAR(36) PRIMARY KEY,
            browser_account_id CHAR(36) NOT NULL,
            platform ENUM('airbnb', 'gathern') NOT NULL,
            status ENUM('healthy', 'expired', 'error') NOT NULL,
            last_check_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            error_message TEXT
          );
        `;

        console.log('📦 Ensuring platform tables exist...');
        await connection.query(tablesSql);

        // 2. Add last_sync_at to browser_accounts if missing
        console.log('🔧 Updating browser_accounts (Safe Alter)...');
        try {
            await connection.query("ALTER TABLE browser_accounts ADD COLUMN last_sync_at DATETIME NULL");
            console.log("   ✅ Added last_sync_at column");
        } catch (err) {
            if (err.errno !== 1060) {
                console.log(`   ⚠️ Error adding last_sync_at: ${err.message}`);
            }
        }

        // 2. Safe Alter (Add Columns if missing)
        console.log('🔧 Updating columns (Safe Alter)...');

        const updates = [
            // Soft Deletes
            "ALTER TABLE accounting_partners ADD COLUMN deleted_at DATETIME NULL",
            "ALTER TABLE accounting_accounts ADD COLUMN deleted_at DATETIME NULL",
            "ALTER TABLE accounting_journals ADD COLUMN deleted_at DATETIME NULL",
            "ALTER TABLE accounting_cost_centers ADD COLUMN deleted_at DATETIME NULL",
            "ALTER TABLE accounting_moves ADD COLUMN deleted_at DATETIME NULL",
            "ALTER TABLE accounting_move_lines ADD COLUMN deleted_at DATETIME NULL",

            // New Features
            "ALTER TABLE accounting_moves ADD COLUMN attachment_url TEXT",
            "ALTER TABLE accounting_move_lines ADD COLUMN cost_center_id CHAR(36)",

            // Indexes
            "CREATE INDEX idx_move_lines_cost_center ON accounting_move_lines(cost_center_id)",
            "CREATE INDEX idx_audit_created ON accounting_audit_logs(created_at)",

            // 3. Update Users Role Enum
            "ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'admin', 'maintenance_worker', 'accountant', 'hr_manager') NOT NULL DEFAULT 'admin'"
        ];

        for (const sql of updates) {
            try {
                await connection.query(sql);
                console.log(`   ✅ Executed: ${sql.substring(0, 50)}...`);
            } catch (err) {
                // Ignore "Duplicate column" (1060) or "Duplicate key" (1061)
                if (err.errno === 1060 || err.errno === 1061) {
                    // console.log(`   ⏭️ Skipped (Exists): ${sql.substring(0, 30)}...`);
                } else {
                    console.log(`   ⚠️ Error: ${err.message} (ignoring)`);
                }
            }
        }

        console.log('✅ Migration Finalized Successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Fatal Error:', err.message);
        process.exit(1);
    }
}

migrate();
