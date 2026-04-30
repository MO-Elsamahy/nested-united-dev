const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    });

    const [rows] = await connection.execute(`
        SELECT 
            DELETE_RULE 
        FROM 
            INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
        WHERE 
            CONSTRAINT_NAME = 'hr_employees_ibfk_1' AND 
            CONSTRAINT_SCHEMA = 'rentals_dashboard'
    `);
    
    console.log(rows[0]?.DELETE_RULE);
    
    await connection.end();
}

main().catch(console.error);
