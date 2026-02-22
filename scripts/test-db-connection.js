const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../.env' }); // Adjust path if needed

async function testConnection() {
    console.log('Testing DB Connection...');
    console.log('Host:', process.env.DB_HOST || 'localhost');
    console.log('User:', process.env.DB_USER || 'root');
    console.log('Database:', process.env.DB_NAME || 'rentals_dashboard');

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'rentals_dashboard'
        });

        console.log('✅ Connection Successful!');

        const [rows] = await connection.execute('SELECT 1 as val');
        console.log('✅ Query Result:', rows);

        await connection.end();
    } catch (error) {
        console.error('❌ Connection Failed:', error.message);
    }
}

testConnection();
