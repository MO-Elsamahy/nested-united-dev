import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard',
    });

    try {
        const [rows] = await connection.execute("DESCRIBE company_settings");
        const logoColumn = rows.find(row => row.Field === 'logo_url');
        console.table([logoColumn]);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

main();
