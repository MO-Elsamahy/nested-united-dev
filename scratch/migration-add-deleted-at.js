const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    try {
        console.log("Adding deleted_at column to users table...");
        await connection.execute("ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL");
        console.log("Success!");
    } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
            console.log("Column deleted_at already exists.");
        } else {
            console.error("Error adding column:", error);
        }
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
