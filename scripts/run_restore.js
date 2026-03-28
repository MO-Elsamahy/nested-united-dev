const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSQL() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard',
        multipleStatements: true,
    });

    try {
        const sqlPath = path.join(__dirname, 'restore_roles.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('⏳ Executing restore_roles.sql...');
        await connection.query(sql);
        console.log('✅ Role restoration complete!');

        const [users] = await connection.execute("SELECT id, name, email, role FROM users");
        console.table(users);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

runSQL();
