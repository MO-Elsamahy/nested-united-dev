const mysql = require('mysql2/promise');

function decodeAirbnbGlobalId(gid) {
  if (!gid) return '';
  try {
    const decoded = Buffer.from(gid, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    return parts[parts.length - 1];
  } catch {
    return gid;
  }
}

async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});

  // Get all browser accounts UIDs
  const [accounts] = await conn.query("SELECT id, platform_user_id FROM browser_accounts WHERE platform='airbnb'");
  const uidMap = new Map();
  for (const acct of accounts) {
    if (acct.platform_user_id) {
      uidMap.set(acct.id, acct.platform_user_id);
    }
  }

  // Get all airbnb messages
  const [messages] = await conn.query("SELECT id, browser_account_id, raw_data, is_from_me FROM platform_messages WHERE platform='airbnb'");
  console.log(`Fetched ${messages.length} Airbnb messages.`);

  let fixCount = 0;
  for (const msg of messages) {
    if (!msg.raw_data) continue;
    try {
      const raw = JSON.parse(msg.raw_data);
      const senderId = String(
        raw.senderId ||
        raw.account?.accountId ||
        decodeAirbnbGlobalId(raw.sender?.id) ||
        raw.sender?.id ||
        ''
      );
      const hostUserId = uidMap.get(msg.browser_account_id);
      
      const isFromMe = (
        raw.role === 'HOST' ||
        raw.senderType === 'HOST' ||
        raw.senderType === 'COHOST' ||
        (hostUserId && senderId === hostUserId)
      );

      const dbIsFromMe = isFromMe ? 1 : 0;
      if (dbIsFromMe !== msg.is_from_me) {
        await conn.query("UPDATE platform_messages SET is_from_me = ? WHERE id = ?", [dbIsFromMe, msg.id]);
        fixCount++;
      }
    } catch (e) {
      console.error(`Error processing message ${msg.id}:`, e.message);
    }
  }

  console.log(`Successfully fixed ${fixCount} messages.`);

  // Delete all placeholders
  await conn.query("DELETE FROM platform_messages WHERE platform_msg_id LIKE 'sent-%'");
  console.log("Deleted placeholders.");

  await conn.end();
}

run();
