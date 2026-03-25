const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
};

async function clearMessages() {
    console.log('🧹 Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('🗑️ Emptying platform_messages table...');
        await connection.execute('TRUNCATE TABLE platform_messages;');
        console.log('✅ All messages deleted successfully. Database is clean!');
    } catch (error) {
        console.error('❌ Error clearing messages:', error);
    } finally {
        await connection.end();
    }
}

clearMessages();
