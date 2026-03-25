const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
};

async function inspectMessages() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        const [rows] = await connection.execute("SELECT raw_data FROM platform_messages WHERE platform='airbnb' LIMIT 15");
        rows.forEach(row => {
            const raw = JSON.parse(row.raw_data);
            if (raw.account?.accountId === '665213856') {
                 console.log("HOST MESG: ", raw.account);
            } else {
                 console.log("GUEST MESG: ", raw.account);
            }
        });
    } catch (error) {
        console.error('❌ Error inspecting messages:', error);
    } finally {
        await connection.end();
    }
}

// inspectMessages();
