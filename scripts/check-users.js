const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [browser] = await conn.query("SELECT id, account_name, platform FROM browser_accounts");
  const [platform] = await conn.query("SELECT id, account_name, platform FROM platform_accounts");
  console.log("Browser Accounts:", browser);
  console.log("Platform Accounts:", platform);
  await conn.end();
}
run();
