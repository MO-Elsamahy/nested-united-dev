const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  await conn.query("DELETE p1 FROM platform_messages p1 INNER JOIN platform_messages p2 ON p1.thread_id = p2.thread_id AND p1.message_text = p2.message_text WHERE p1.platform_msg_id LIKE 'sent-%' AND p2.platform_msg_id NOT LIKE 'sent-%'");
  console.log('Placeholders cleaned!');
  await conn.end();
}
run();
