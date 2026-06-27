import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import mysql from "mysql2/promise";
import crypto from "crypto";

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "rentals_dashboard",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const { accountId, platform, threadId, text, metadata, placeholderOnly, guestName } = await req.json();
    
    if (!accountId || !platform || !threadId || !text) {
      return NextResponse.json({ success: false, error: "معلومات مفقودة" }, { status: 400 });
    }

    const conn = await mysql.createConnection(dbConfig);
    const [accounts]: any = await conn.execute(
      "SELECT * FROM browser_accounts WHERE id = ?",
      [accountId]
    );

    if (!accounts || accounts.length === 0) {
      await conn.end();
      return NextResponse.json({ success: false, error: "الحساب غير موجود في قاعدة البيانات" }, { status: 404 });
    }

    const account = accounts[0];
    let ok = false;

    if (placeholderOnly) {
      ok = true;
    } else if (platform === "gathern") {
      if (!account.chat_auth_token) {
        await conn.end();
        return NextResponse.json({ success: false, error: "لا يوجد توكن متاح لجاذر إن، يرجى فتح المتصفح أولاً" }, { status: 400 });
      }

      // We need unit_id and chalet_id for Gathern send
      let unitId = metadata?.unitId;
      let chaletId = metadata?.chaletId;
      if (!unitId) {
        // Try fetching from platform_thread_metadata
        try {
          const [metaRows]: any = await conn.execute(
            "SELECT unit_id, chalet_id FROM platform_thread_metadata WHERE browser_account_id = ? AND thread_id = ?",
            [accountId, threadId]
          );
          if (metaRows && metaRows.length > 0) {
            unitId = metaRows[0].unit_id || metaRows[0].chalet_id;
            chaletId = metaRows[0].chalet_id || metaRows[0].unit_id;
          }
        } catch(e) {
          /* table might not exist, ignore */
        }
        
        if (!unitId) {
          // Try fetching from latest message raw_data
          try {
            const [msgRows]: any = await conn.execute(
              "SELECT raw_data FROM platform_messages WHERE browser_account_id = ? AND thread_id = ? AND raw_data IS NOT NULL ORDER BY sent_at DESC LIMIT 1",
              [accountId, threadId]
            );
            if (msgRows && msgRows.length > 0) {
              const raw = JSON.parse(msgRows[0].raw_data);
              unitId = raw.unit_id || raw.chalet_id;
              chaletId = raw.chalet_id || raw.unit_id;
            }
          } catch(e) {
            /* ignore JSON parse or DB errors */
          }
        }
      }

      if (!unitId) {
        await conn.end();
        return NextResponse.json({ success: false, error: "لم يتم العثور على unit_id لهذه المحادثة" }, { status: 400 });
      }

      const res = await fetch('https://chatapi-prod.gathern.co/v1/business/message/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.chat_auth_token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
          'Origin': 'https://business.gathern.co',
          'Referer': `https://business.gathern.co/app/chat/${threadId}`
        },
        body: JSON.stringify({
          chat_uid: threadId,
          message: text,
          type: "text",
          chat_type: 2,
          unit_id: Number(unitId),
          chalet_id: Number(chaletId || unitId),
          unitId: Number(unitId)
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        await conn.end();
        return NextResponse.json({ success: false, error: `فشل إرسال جاذر إن: ${res.status} - ${errorText}` }, { status: 500 });
      }
      ok = true;

    } else if (platform === "airbnb") {
      if (!account.cookies_json) {
        await conn.end();
        return NextResponse.json({ success: false, error: "لا يوجد كوكيز متاحة لـ Airbnb، يرجى فتح المتصفح أولاً" }, { status: 400 });
      }

      // ── Look up the send mutation hash from the registry (adaptive) ─
      let sendHash = "94ac2c4bd07edace539dbf2b9665d9030b6dee479db345ba8a8bbc234b3bbfa3"; // fallback
      try {
        const [regRows]: any = await conn.execute(
          `SELECT sha256_hash FROM graphql_operations 
           WHERE platform='airbnb' AND operation_name='CreateBulkMessagesMutation' AND is_active=1
           ORDER BY last_seen_at DESC LIMIT 1`
        );
        if (regRows?.length > 0) sendHash = regRows[0].sha256_hash;
        else {
          // Also try the older single-thread send mutation name
          const [regRows2]: any = await conn.execute(
            `SELECT sha256_hash FROM graphql_operations 
             WHERE platform='airbnb' AND (operation_name LIKE '%SendMessage%' OR operation_name LIKE '%ThreadSend%') AND is_active=1
             ORDER BY last_seen_at DESC LIMIT 1`
          );
          if (regRows2?.length > 0) sendHash = regRows2[0].sha256_hash;
        }
      } catch { /* fallback already set */ }

      const res = await fetch(`https://www.airbnb.com/api/v3/CreateBulkMessagesMutation/${sendHash}?operationName=CreateBulkMessagesMutation&locale=en&currency=SAR`, {
        method: 'POST',
        headers: {
          'Cookie': account.cookies_json,
          'x-airbnb-api-key': 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
          'Content-Type': 'application/json',
          'Origin': 'https://www.airbnb.com',
          'Referer': `https://www.airbnb.com/hosting/messages/${threadId}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          operationName: "CreateBulkMessagesMutation",
          variables: {
            message: text,
            messageThreadIds: [Number(threadId)],
          },
          extensions: {
            persistedQuery: { version: 1, sha256Hash: sendHash }
          }
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        await conn.end();
        return NextResponse.json({ success: false, error: `فشل إرسال Airbnb: ${res.status} - ${errorText}` }, { status: 500 });
      }
      ok = true;


    } else {
      await conn.end();
      return NextResponse.json({ success: false, error: "منصة غير مدعومة للإرسال من السيرفر" }, { status: 400 });
    }

    if (ok) {
      // Race condition mitigation: check if the real message already arrived via CDP interceptor
      const [existing]: any = await conn.execute(
        `SELECT id FROM platform_messages 
         WHERE thread_id = ? AND platform = ? AND message_text = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`,
        [threadId, platform, text]
      );

      if (existing && existing.length > 0) {
        // Real message already exists. Just fix is_from_me in case it was set to 0
        await conn.execute(
          `UPDATE platform_messages SET is_from_me = 1 WHERE id = ?`,
          [existing[0].id]
        );
      } else {
        // Insert placeholder — use provided guestName if available, NOT hardcoded 'Guest'
        const resolvedGuestName = guestName || 'Guest';
        await conn.execute(
          `INSERT INTO platform_messages 
             (id, browser_account_id, platform, thread_id, platform_msg_id, 
              guest_name, message_text, is_from_me, sent_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
           ON DUPLICATE KEY UPDATE 
             message_text = VALUES(message_text),
             guest_name = IF(VALUES(guest_name) != 'Guest' AND VALUES(guest_name) != '', VALUES(guest_name), guest_name)`,
          [crypto.randomUUID(), accountId, platform, 
           threadId, `sent-${Date.now()}`, resolvedGuestName, text]
        );
      }
    }

    await conn.end();
    return NextResponse.json({ success: true });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
