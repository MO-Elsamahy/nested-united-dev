const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Manually parse .env since dotenv might not be available
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length === 2) {
        process.env[parts[0].trim()] = parts[1].trim();
      }
    });
  }
}

loadEnv();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
  });

  try {
    console.log('Starting migration...');

    await connection.execute(`
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
        INDEX idx_pm_read (is_read),
        FOREIGN KEY (platform_account_id) REFERENCES browser_accounts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS session_health_logs (
        id CHAR(36) PRIMARY KEY,
        browser_account_id CHAR(36) NOT NULL,
        platform ENUM('airbnb', 'gathern') NOT NULL,
        status ENUM('healthy', 'expired', 'error') NOT NULL,
        last_check_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        error_message TEXT,
        FOREIGN KEY (browser_account_id) REFERENCES browser_accounts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await connection.end();
  }
}

migrate();
