const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [rows] = await conn.query("SELECT id, thread_id, platform_msg_id, message_text, is_from_me FROM platform_messages WHERE platform='airbnb' ORDER BY sent_at DESC LIMIT 20");
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}
run();
