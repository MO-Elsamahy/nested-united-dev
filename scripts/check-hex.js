const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [rows] = await conn.query("SELECT platform_msg_id, HEX(message_text) as hex FROM platform_messages WHERE message_text='مرحبا' ORDER BY created_at DESC LIMIT 2");
  console.log(rows);
  await conn.end();
}
run();
