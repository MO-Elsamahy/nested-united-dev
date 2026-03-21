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

        // 1. Create Tables (New ones like audit_logs)
        const tablesSql = `
      CREATE TABLE IF NOT EXISTS accounting_partners (id CHAR(36) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50), type ENUM('customer', 'supplier', 'employee', 'other') DEFAULT 'customer', tax_id VARCHAR(50), address TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_accounts (id CHAR(36) PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(255), type VARCHAR(50), is_reconcilable BOOLEAN DEFAULT FALSE, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_journals (id CHAR(36) PRIMARY KEY, name VARCHAR(255), code VARCHAR(10), type VARCHAR(50), default_account_id CHAR(36), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_cost_centers (id CHAR(36) PRIMARY KEY, code VARCHAR(20) NOT NULL UNIQUE, name VARCHAR(255), description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_moves (id CHAR(36) PRIMARY KEY, journal_id CHAR(36), date DATE, ref VARCHAR(255), narration TEXT, state ENUM('draft', 'posted', 'canceled'), partner_id CHAR(36), amount_total DECIMAL(15,2), created_by CHAR(36), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_move_lines (id CHAR(36) PRIMARY KEY, move_id CHAR(36), account_id CHAR(36), partner_id CHAR(36), name VARCHAR(255), debit DECIMAL(15,2), credit DECIMAL(15,2), date_maturity DATE, reconciled BOOLEAN, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS accounting_audit_logs (id CHAR(36) PRIMARY KEY, user_id CHAR(36), action VARCHAR(50), entity_type VARCHAR(50), entity_id CHAR(36), details JSON, ip_address VARCHAR(50), created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS role_system_permissions (
        id CHAR(36) PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        system_id VARCHAR(50) NOT NULL,
        can_access BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_system (role, system_id)
      );
    `;

        console.log('📦 Ensuring tables exist...');
        await connection.query(tablesSql);

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
