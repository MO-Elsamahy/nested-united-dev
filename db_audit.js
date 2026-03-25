const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard'
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    console.log('Tables in database:', tables.map(t => Object.values(t)[0]));
    
    const [columns] = await connection.query("SHOW COLUMNS FROM units");
    if (!columns.find(c => c.Field === 'readiness_updated_at')) {
        console.log('Missing readiness_updated_at in units table!');
    } else {
        console.log('readiness_updated_at exists.');
    }

    const companySettingsExists = tables.some(t => Object.values(t)[0] === 'company_settings');
    console.log('company_settings table exists:', companySettingsExists);

  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await connection.end();
  }
}

checkDb();
