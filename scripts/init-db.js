const mysql = require('mysql2/promise');

async function setupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
  });

  try {
    console.log("Creating database 'rentals_dashboard' if it doesn't exist...");
    await connection.query('CREATE DATABASE IF NOT EXISTS rentals_dashboard');
    await connection.query('USE rentals_dashboard');
    
    console.log("Creating 'platform_messages' table...");
    await connection.query(`
        CREATE TABLE IF NOT EXISTS platform_messages (
            id VARCHAR(255) PRIMARY KEY,
            browser_account_id VARCHAR(255) NOT NULL,
            platform ENUM('airbnb', 'gathern') NOT NULL,
            thread_id VARCHAR(255) NOT NULL,
            sender_name VARCHAR(255),
            message_text TEXT,
            timestamp DATETIME,
            is_read BOOLEAN DEFAULT FALSE,
            raw_payload JSON,
            INDEX (thread_id),
            INDEX (timestamp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Creating 'session_health_logs' table...");
    await connection.query(`
        CREATE TABLE IF NOT EXISTS session_health_logs (
            id VARCHAR(255) PRIMARY KEY,
            browser_account_id VARCHAR(255) NOT NULL,
            platform ENUM('airbnb', 'gathern') NOT NULL,
            status ENUM('healthy', 'expired', 'error') NOT NULL,
            error_message TEXT,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Database and new tables verified successfully.');
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await connection.end();
  }
}

setupDatabase();
