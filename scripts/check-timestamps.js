const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [rows] = await conn.query("DESCRIBE reservations");
  console.log(rows);
  await conn.end();
}
run();
