const mysql = require('mysql2/promise');

async function run() {
  let conn;
  try {
    console.log('🔄 Connecting to database...');
    conn = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'rentals_dashboard',
      multipleStatements: true
    });

    console.log('🧹 Cleaning duplicate messages...');
    
    // Create a temporary table with unique rows
    await conn.query(`
      CREATE TABLE platform_messages_tmp AS
      SELECT * FROM platform_messages
      WHERE id IN (
        SELECT MIN(id)
        FROM platform_messages
        GROUP BY browser_account_id, platform, thread_id, platform_msg_id
      )
    `);

    // Drop original table and rename tmp table
    await conn.query('RENAME TABLE platform_messages TO platform_messages_old, platform_messages_tmp TO platform_messages');
    
    // We need to restore primary key and defaults on the new table
    await conn.query('ALTER TABLE platform_messages ADD PRIMARY KEY (id)');
    await conn.query('ALTER TABLE platform_messages MODIFY COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    
    // Add the missing unique constraint!
    console.log('🔐 Adding unique constraint...');
    await conn.query('ALTER TABLE platform_messages ADD UNIQUE KEY uk_platform_msg (browser_account_id, platform, thread_id, platform_msg_id)');

    // Clean up old table
    await conn.query('DROP TABLE platform_messages_old');

    console.log('🎉 Duplicates cleaned and constraint added successfully!');
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

run();
