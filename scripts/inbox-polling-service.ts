import mysql from 'mysql2/promise';

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line: string) => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim();
      });
    }
  } catch (e) {}
  return env;
}

const env = loadEnv();
const DB_HOST = env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(env.DB_PORT || '3306', 10);
const DB_USER = env.DB_USER || 'root';
const DB_PASS = env.DB_PASSWORD || '';
const DB_NAME = env.DB_NAME || 'rentals_dashboard';

let pool: mysql.Pool | null = null;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

const crypto = require('crypto');
function randomUUID() {
  return crypto.randomUUID();
}

async function pollGathernAccount(account: any) {
  if (!account.chat_auth_token) return;
  console.log(`[Polling] 🔄 Gathern: Fetching for ${account.account_name}`);
  
  try {
    const res = await fetch('https://chatapi-prod.gathern.co/v1/business/chats', {
      headers: {
        'Authorization': `Bearer ${account.chat_auth_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const chats = Array.isArray(json.data) ? json.data : [];
    
    let newCount = 0;
    const db = getPool();

    for (const chat of chats) {
      if (!chat.id || !chat.last_message) continue;
      
      const threadId = String(chat.id);
      const msg = chat.last_message;
      const isFromMe = msg.type === 'owner_text' || msg.sender_id === Number(account.platform_user_id);
      
      let finalIsFromMe = isFromMe ? 1 : 0;
      const text = msg.content || '';
      
      try {
        const [placeholders]: any = await db.execute(
          `SELECT id FROM platform_messages 
           WHERE thread_id = ? AND platform = ? AND message_text = ? AND platform_msg_id LIKE 'sent-%' AND is_from_me = 1`,
          [threadId, 'gathern', text]
        );
        if (placeholders && placeholders.length > 0) {
          finalIsFromMe = 1;
          await db.execute(`DELETE FROM platform_messages WHERE id = ?`, [placeholders[0].id]);
        }
      } catch (e) {}

      const [result]: any = await db.execute(`
        INSERT INTO platform_messages 
          (id, browser_account_id, platform_account_id, platform, thread_id, platform_msg_id, guest_name, message_text, is_from_me, sent_at, raw_data)
        VALUES (?, ?, ?, 'gathern', ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          message_text = VALUES(message_text),
          raw_data = VALUES(raw_data)
      `, [
        randomUUID(),
        account.id,
        account.platform_account_id || null,
        threadId,
        String(msg.id),
        chat.guest?.name || 'Guest',
        text,
        finalIsFromMe,
        new Date(msg.created_at || Date.now()),
        JSON.stringify(chat)
      ]);

      if (result.affectedRows > 0) newCount++;
    }

    console.log(`[Polling] ✅ Gathern: Processed ${chats.length} chats for ${account.account_name} (${newCount} new/updated)`);
    
    await db.execute('UPDATE browser_accounts SET last_poll_at = NOW(), poll_error = NULL WHERE id = ?', [account.id]);
  } catch (err: any) {
    console.error(`[Polling] ❌ Gathern Error for ${account.account_name}:`, err.message);
    const db = getPool();
    await db.execute('UPDATE browser_accounts SET poll_error = ? WHERE id = ?', [err.message, account.id]);
  }
}

async function pollAirbnbAccount(account: any) {
  if (!account.cookies_json) return;
  console.log(`[Polling] 🔄 Airbnb: Fetching for ${account.account_name}`);
  
  try {
    const res = await fetch('https://www.airbnb.com/api/v3/ViaductInboxData/fce1ba6025bc4390f055627685d0b9ccb2229ab3034ff9b57a3e7db120c93a02', {
      method: 'POST',
      headers: {
        'Cookie': account.cookies_json,
        'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36'
      },
      body: JSON.stringify({
        operationName: "ViaductInboxData",
        variables: {
          includeActionCards: false,
          includeAttachments: true,
          includeStandardCards: true,
          includeGreetingOptions: false,
          includePincodeCards: true,
          inboxPaginationInput: { limit: 20 }
        },
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: "fce1ba6025bc4390f055627685d0b9ccb2229ab3034ff9b57a3e7db120c93a02"
          }
        }
      })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const threads = json.data?.presentation?.inbox?.threads?.threads || [];
    
    let newCount = 0;
    const db = getPool();

    for (const thread of threads) {
      if (!thread.threadId) continue;
      
      const threadId = thread.threadId;
      const latestMsg = thread.latestMessage || {};
      const isFromMe = latestMsg.senderType === 'HOST' || latestMsg.senderType === 'COHOST';
      
      // Extract text safely
      let text = '';
      if (latestMsg.text) {
        if (typeof latestMsg.text === 'string') text = latestMsg.text;
        else if (latestMsg.text.accessibilityText) text = latestMsg.text.accessibilityText;
        else if (Array.isArray(latestMsg.text.components)) text = latestMsg.text.components.map((c:any) => c.text).join(' ');
      }
      if (!text) text = latestMsg.body || latestMsg.message || '';

      const guestName = thread.users?.find((u:any) => u.type === 'GUEST')?.name || 'Guest';
      const msgId = latestMsg.id || thread.latestMessageId || 'unknown';

      let finalIsFromMe = isFromMe ? 1 : 0;
      try {
        const [placeholders]: any = await db.execute(
          `SELECT id FROM platform_messages 
           WHERE thread_id = ? AND platform = ? AND message_text = ? AND platform_msg_id LIKE 'sent-%' AND is_from_me = 1`,
          [threadId, 'airbnb', text]
        );
        if (placeholders && placeholders.length > 0) {
          finalIsFromMe = 1;
          await db.execute(`DELETE FROM platform_messages WHERE id = ?`, [placeholders[0].id]);
        }
      } catch (e) {}

      const [result]: any = await db.execute(`
        INSERT INTO platform_messages 
          (id, browser_account_id, platform_account_id, platform, thread_id, platform_msg_id, guest_name, message_text, is_from_me, sent_at, raw_data)
        VALUES (?, ?, ?, 'airbnb', ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          message_text = VALUES(message_text),
          raw_data = VALUES(raw_data)
      `, [
        randomUUID(),
        account.id,
        account.platform_account_id || null,
        threadId,
        String(msgId),
        guestName,
        text,
        finalIsFromMe,
        new Date(latestMsg.createdAt || Date.now()),
        JSON.stringify(thread)
      ]);

      if (result.affectedRows > 0) newCount++;
    }

    console.log(`[Polling] ✅ Airbnb: Processed ${threads.length} threads for ${account.account_name} (${newCount} new/updated)`);
    
    await db.execute('UPDATE browser_accounts SET last_poll_at = NOW(), poll_error = NULL WHERE id = ?', [account.id]);
  } catch (err: any) {
    console.error(`[Polling] ❌ Airbnb Error for ${account.account_name}:`, err.message);
    const db = getPool();
    await db.execute('UPDATE browser_accounts SET poll_error = ? WHERE id = ?', [err.message, account.id]);
  }
}

async function runPoll() {
  const db = getPool();
  try {
    const [accounts]: any = await db.query('SELECT * FROM browser_accounts WHERE is_active = 1');
    for (const acc of accounts) {
      if (acc.platform === 'gathern') {
        await pollGathernAccount(acc);
      } else if (acc.platform === 'airbnb') {
        await pollAirbnbAccount(acc);
      }
    }
  } catch (e: any) {
    console.error('[Polling] Fatal Error:', e.message);
  }
}

// Run every 3 minutes
console.log('🚀 Standalone Inbox Polling Service started (interval: 3m)');
runPoll();
setInterval(runPoll, 3 * 60 * 1000);
