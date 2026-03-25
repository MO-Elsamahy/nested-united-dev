const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
  }
  return env;
}

async function check() {
  const env = loadEnv();
  const connection = await mysql.createConnection({
    host: env['DB_HOST'] || 'localhost',
    port: parseInt(env['DB_PORT'] || '3306'),
    user: env['DB_USER'] || 'root',
    password: env['DB_PASSWORD'] || '',
    database: env['DB_NAME'] || 'rentals_dashboard',
  });

  try {
    const [rows] = await connection.execute("SELECT count(*) as count FROM platform_messages");
    console.log(`Total messages in DB: ${rows[0].count}`);
    
    const [accounts] = await connection.execute("SELECT id, platform, account_name FROM browser_accounts");
    console.log("Accounts in DB:");
    console.table(accounts);
    
    const [health] = await connection.execute("SELECT * FROM session_health_logs ORDER BY last_check_at DESC LIMIT 5");
    console.log("Last 5 health logs:");
    console.table(health);
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await connection.end();
  }
}

check();
