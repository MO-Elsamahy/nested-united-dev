
import mysql from 'mysql2/promise';

async function main() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentals_dashboard',
    });

    try {
        const [rows] = await connection.execute("SHOW TABLES");
        console.table(rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

main();
