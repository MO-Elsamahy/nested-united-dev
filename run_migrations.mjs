import mysql from "mysql2/promise";

const db = await mysql.createConnection("mysql://root:@localhost:3306/rentals_dashboard");

await db.execute(
  `INSERT IGNORE INTO graphql_operations 
   (platform, operation_name, sha256_hash, endpoint_url, category, sample_headers)
   VALUES (?,?,?,?,?,?)`,
  [
    'airbnb',
    'CreateBulkMessagesMutation',
    '94ac2c4bd07edace539dbf2b9665d9030b6dee479db345ba8a8bbc234b3bbfa3',
    'https://www.airbnb.com/api/v3/CreateBulkMessagesMutation/94ac2c4bd07edace539dbf2b9665d9030b6dee479db345ba8a8bbc234b3bbfa3',
    'send',
    JSON.stringify({ "x-airbnb-api-key": "d306zoyjsyarp7ifhu67rjxn52tv0t20", "content-type": "application/json" })
  ]
);
console.log("✅ CreateBulkMessagesMutation registered");
await db.destroy();
