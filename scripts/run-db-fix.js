const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  try {
    console.log('🔄 Connecting to database...');
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'rentals_dashboard',
      multipleStatements: true
    });

    console.log('📦 Reading fix-db.sql...');
    const sqlPath = path.join(__dirname, 'fix-db.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split statements manually because multipleStatements in mysql2 sometimes has issues with ALTER
    const statements = sql.split(';').filter(s => s.trim().length > 0);

    console.log('🚀 Executing SQL queries...');
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log('✅ Query executed successfully.');
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('⚠️ Column already exists, skipping...');
        } else if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log('⚠️ Table already exists, skipping...');
        } else {
          console.error('❌ Query failed:', err.message);
        }
      }
    }

    await conn.end();
    console.log('🎉 Database fixed successfully!');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

run();
