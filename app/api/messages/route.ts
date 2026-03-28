import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('accountId');
  const threadId = searchParams.get('threadId'); // If provided, fetch history for this thread
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    if (threadId) {
      // ─────────────────────────────────────────────
      // CHAT HISTORY: Get all messages for a specific thread
      // ─────────────────────────────────────────────
      const messages = await query(`
        SELECT id, platform_account_id, platform, thread_id, platform_msg_id, 
               guest_name, message_text, is_from_me, sent_at, timestamp as received_at,
               raw_data
        FROM platform_messages
        WHERE thread_id = ?
        ORDER BY sent_at ASC
      `, [threadId]);
      
      return NextResponse.json({ success: true, messages });
    } else {
      // ─────────────────────────────────────────────
      // INBOX LIST: Get exactly 1 LATEST message per thread (Compatible with older MySQL)
      // ─────────────────────────────────────────────
      let sql = `
        SELECT pm.*, ba.account_name
        FROM platform_messages pm
        INNER JOIN (
          SELECT MAX(id) as latest_id
          FROM platform_messages
          WHERE (platform_account_id, thread_id, sent_at) IN (
            SELECT platform_account_id, thread_id, MAX(sent_at)
            FROM platform_messages
            GROUP BY platform_account_id, thread_id
          )
          GROUP BY platform_account_id, thread_id
        ) latest ON pm.id = latest.latest_id
        LEFT JOIN browser_accounts ba ON ba.id = pm.platform_account_id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (accountId && accountId !== 'all') {
        sql += ' AND pm.platform_account_id = ?';
        params.push(accountId);
      }

      sql += ' ORDER BY pm.sent_at DESC LIMIT ?';
      params.push(limit);

      const messages = await query(sql, params);
      return NextResponse.json({ success: true, messages });
    }
  } catch (err: any) {
    console.error('[API Messages] ❌', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
