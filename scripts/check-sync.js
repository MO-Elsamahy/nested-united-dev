const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function diagnostic() {
    console.log('🔍 Running Gathern Diagnostic...');
    
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'rentals_dashboard'
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        
        // 1. Check Accounts
        const [accounts] = await connection.query('SELECT id, platform, account_name, last_sync_at FROM browser_accounts');
        console.log('\n📦 Platform Accounts:');
        accounts.forEach(a => {
            console.log(`- [${a.platform}] ${a.account_name} (Last Sync: ${a.last_sync_at})`);
        });

        // 2. Count Messages
        const [counts] = await connection.query('SELECT platform, COUNT(*) as count FROM platform_messages GROUP BY platform');
        console.log('\n💬 Message Counts:');
        counts.forEach(c => {
            console.log(`- ${c.platform}: ${c.count} messages`);
        });

        // 3. Recent Gathern Messages
        const [recent] = await connection.query("SELECT thread_id, guest_name, message_text, sent_at FROM platform_messages WHERE platform = 'gathern' ORDER BY sent_at DESC LIMIT 5");
        if (recent.length > 0) {
            console.log('\n🕒 Recent Gathern Messages:');
            recent.forEach(m => {
                console.log(`- ${m.guest_name}: ${m.message_text.substring(0, 30)}... (${m.sent_at})`);
            });
        } else {
            console.log('\n❌ No Gathern messages found in database.');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Diagnostic Error:', err.message);
        process.exit(1);
    }
}

diagnostic();
