const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    const userId = "249a8942-353f-448c-911c-2ad3b444d457";

    try {
        console.log(`Soft-deleting user ${userId}...`);
        
        await connection.beginTransaction();
        
        // 1. Mark user as deleted and inactive
        await connection.execute(
            "UPDATE users SET deleted_at = NOW(), is_active = 0 WHERE id = ?",
            [userId]
        );

        // 2. Mark linked employee as terminated
        await connection.execute(
            "UPDATE hr_employees SET status = 'terminated' WHERE user_id = ?",
            [userId]
        );
        
        await connection.commit();
        console.log("Success!");

        // Verify
        const [user] = await connection.execute("SELECT deleted_at, is_active FROM users WHERE id = ?", [userId]);
        console.log("User Status:", user[0]);

        const [emp] = await connection.execute("SELECT status FROM hr_employees WHERE user_id = ?", [userId]);
        console.log("Employee Status:", emp[0]);

    } catch (error) {
        await connection.rollback();
        console.error("Error:", error);
    } finally {
        await connection.end();
    }
}

main().catch(console.error);
