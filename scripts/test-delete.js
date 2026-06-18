const mysql = require('mysql2/promise');
async function run() {
  const pool = mysql.createPool({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  try {
    const id = 'b782002c-0741-4a66-8f29-7e35cdb258de';
    const [result] = await pool.execute(`DELETE FROM platform_messages WHERE id = ?`, [id]);
    console.log("Delete result:", result.affectedRows);
  } catch (e) {
    console.error("Error:", e);
  }
  await pool.end();
}
run();
