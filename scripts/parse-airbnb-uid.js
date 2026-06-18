const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({host:'127.0.0.1', user:'root', database:'rentals_dashboard'});
  const [rows] = await conn.query("SELECT id, account_name, cookies_json FROM browser_accounts WHERE platform='airbnb'");
  
  for (const r of rows) {
    let uid = null;
    try {
      if (r.cookies_json) {
        let text = r.cookies_json;
        // Sometimes cookies_json is a JSON string of headers, sometimes an array
         if (text.startsWith('[')) {
          const cookies = JSON.parse(text);
          const idCookie = cookies.find(c => c.name === 'a12_uid' || c.name === 'userId' || c.name === 'USER_ID' || c.name.includes('uid') || c.name === '_user_attributes');
          if (idCookie) {
            if (idCookie.name === '_user_attributes') {
              try {
                const parsed = typeof idCookie.value === 'string' ? JSON.parse(decodeURIComponent(idCookie.value)) : idCookie.value;
                uid = parsed.id_str || String(parsed.id);
              } catch(e) {}
            } else {
              uid = idCookie.value;
            }
          }
        } else {
          // parse Cookie header
          const match = text.match(/USER_ID=([^;]+)/i) || text.match(/a12_uid=([^;]+)/i);
          if (match) {
            uid = match[1];
          } else {
            const attrMatch = text.match(/_user_attributes=([^;]+)/i);
            if (attrMatch) {
              try {
                const decoded = decodeURIComponent(attrMatch[1]);
                const parsed = JSON.parse(decoded);
                uid = parsed.id_str || String(parsed.id);
              } catch(e) {}
            }
          }
        }
      }
    } catch(e) {}
    console.log(`Account: ${r.account_name}, UID: ${uid}`);
    
    if (uid) {
       await conn.query("UPDATE browser_accounts SET platform_user_id = ? WHERE id = ?", [uid, r.id]);
    }
  }
  await conn.end();
}
run();
