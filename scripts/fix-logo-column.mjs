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
        console.log("Altering table 'company_settings' to modify 'logo_url' column...");
        await connection.execute('ALTER TABLE company_settings MODIFY logo_url LONGTEXT');
        console.log("Successfully changed 'logo_url' to LONGTEXT.");
    } catch (error) {
        console.error('Error executing migration:', error);
    } finally {
        await connection.end();
    }
}

main();
