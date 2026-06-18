const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [rows] = await conn.query("SELECT id FROM platform_messages WHERE thread_id = '2009465301' AND platform = 'airbnb' AND message_text = 'مرحبا' AND platform_msg_id LIKE 'sent-%' AND is_from_me = 1");
  console.log(rows);
  await conn.end();
}
run();
