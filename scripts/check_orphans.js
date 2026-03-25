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
    const [orphans] = await connection.execute(`
      SELECT pm.platform_account_id, COUNT(*) as count 
      FROM platform_messages pm 
      LEFT JOIN browser_accounts ba ON pm.platform_account_id = ba.id 
      WHERE ba.id IS NULL 
      GROUP BY pm.platform_account_id
    `);
    
    if (orphans.length > 0) {
      console.log("Found orphan messages (no matching account)! Count per ID:");
      console.table(orphans);
    } else {
      console.log("No orphan messages found. All messages have matching accounts.");
    }

    const [sample] = await connection.execute("SELECT * FROM platform_messages LIMIT 1");
    if (sample.length > 0) {
        console.log("Sample message raw_data snippet:");
        console.log(JSON.stringify(sample[0].raw_data).substring(0, 500));
    }
  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await connection.end();
  }
}

check();
