const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'rentals_dashboard'
    });

    try {
        // Check if table exists
        const [tables] = await conn.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='rentals_dashboard' AND table_name='company_settings'"
        );
        console.log('company_settings exists:', tables.length > 0 ? 'YES' : 'NO');

        if (tables.length > 0) {
            const [rows] = await conn.execute('SELECT id, company_name FROM company_settings LIMIT 1');
            console.log('Rows in company_settings:', rows.length);
            console.log('Data:', JSON.stringify(rows));
        }
    } catch (err) {
        console.error('DB Error:', err.message);
    } finally {
        await conn.end();
    }
}

check();
