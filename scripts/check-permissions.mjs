
import mysql from 'mysql2/promise';

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentals_dashboard',
    });

    try {
        // Check if table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'role_system_permissions'");
        if (tables.length === 0) {
            console.log("Table 'role_system_permissions' does not exist.");
        } else {
            console.log("Table 'role_system_permissions' exists.");
            const [rows] = await connection.execute("SELECT * FROM role_system_permissions");
            console.table(rows);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

main();
