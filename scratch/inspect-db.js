const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    const [tables] = await connection.execute("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    for (const table of tableNames) {
        console.log(`--- Table: ${table} ---`);
        const [columns] = await connection.execute(`DESCRIBE ${table}`);
        columns.forEach(c => console.log(`${c.Field} (${c.Type})`));
    }
    
    await connection.end();
}

main().catch(console.error);
