const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  try {
    const threadId = '2009465301';
    const platform = 'airbnb';
    const messageText = 'مرحبا';
    
    const [placeholders] = await pool.execute(
      `SELECT id FROM platform_messages 
       WHERE thread_id = ? AND platform = ? AND message_text = ? AND platform_msg_id LIKE 'sent-%' AND is_from_me = 1`,
      [threadId, platform, messageText]
    );
    console.log("Placeholders found:", placeholders);
  } catch (e) {
    console.error("Error:", e);
  }
  await pool.end();
}
run();
