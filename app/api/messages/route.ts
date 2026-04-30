import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';

// ─────────────────────────────────────────────
// GET /api/messages
//   ?limit=50               → inbox list (one latest message per thread)
//   ?threadId=XXX           → full thread history
//   ?accountId=XXX          → filter by browser_account_id
//   ?platform=airbnb|gathern → filter by platform
// ─────────────────────────────────────────────

interface MessageRow {
  id: string;
  platform_account_id: string;
  platform: string;
  thread_id: string;
  platform_msg_id: string | null;
  guest_name: string;
  sender_name: string | null;
  message_text: string | null;
  is_from_me: number;
  sent_at: string;
  received_at: string;
  raw_data: string | null;
  account_name: string | null;
  platform_account_name?: string | null;
}

interface PostBody {
  threadId?: string;
  browserAccountId?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accountId  = searchParams.get('accountId');
  const threadId   = searchParams.get('threadId');
  const platform   = searchParams.get('platform');
  const limit      = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

  try {
    if (threadId) {
      // ──────────────────────────────────────────────
      // THREAD HISTORY — all messages for one thread
      // ──────────────────────────────────────────────

      // Accept optional accountId to scope to one browser account
      const params: unknown[] = [threadId];
      let sql = `
        SELECT
          pm.id,
          pm.browser_account_id  AS platform_account_id,
          pm.platform,
          pm.thread_id,
          pm.platform_msg_id,
          COALESCE(NULLIF(ptm.guest_name, ''), NULLIF(pm.guest_name, ''), 'Guest') AS guest_name,
          pm.sender_name,
          pm.message_text,
          pm.is_from_me,
          pm.sent_at,
          pm.sent_at             AS received_at,
          pm.raw_data,
          ba.account_name
        FROM platform_messages pm
        LEFT JOIN browser_accounts ba ON ba.id = pm.browser_account_id
        LEFT JOIN platform_thread_metadata ptm
          ON ptm.browser_account_id = pm.browser_account_id
         AND ptm.thread_id = pm.thread_id
         AND ptm.platform = pm.platform
        WHERE pm.thread_id = ?
      `;

      if (accountId && accountId !== 'all') {
        sql += ' AND pm.browser_account_id = ?';
        params.push(accountId);
      }

      sql += ' ORDER BY pm.sent_at ASC';

      const messages = await query<MessageRow>(sql, params);
      return NextResponse.json({ success: true, messages });
    }

    // ──────────────────────────────────────────────
    // INBOX LIST — one latest message per thread
    // Uses a subquery to get MAX(sent_at) per (browser_account_id, thread_id)
    // ──────────────────────────────────────────────
    const params: unknown[] = [];
    let whereClauses = '1=1';

    if (accountId && accountId !== 'all') {
      whereClauses += ' AND pm.browser_account_id = ?';
      params.push(accountId);
    }

    if (platform && platform !== 'all') {
      whereClauses += ' AND pm.platform = ?';
      params.push(platform);
    }

    // Add limit at the end
    params.push(limit);

    const sql = `
      SELECT
        pm.id,
        pm.browser_account_id  AS platform_account_id,
        pm.platform,
        pm.thread_id,
        pm.platform_msg_id,
        COALESCE(NULLIF(ptm.guest_name, ''), NULLIF(pm.guest_name, ''), 'Guest') AS guest_name,
        pm.sender_name,
        pm.message_text,
        pm.is_from_me,
        pm.sent_at,
        pm.sent_at             AS received_at,
        pm.raw_data,
        ba.account_name,
        pa.account_name        AS platform_account_name
      FROM platform_messages pm
      INNER JOIN (
        SELECT
          browser_account_id,
          thread_id,
          MAX(sent_at) AS max_sent
        FROM platform_messages
        GROUP BY browser_account_id, thread_id
      ) latest
        ON  pm.browser_account_id = latest.browser_account_id
        AND pm.thread_id          = latest.thread_id
        AND pm.sent_at            = latest.max_sent
      LEFT JOIN browser_accounts ba
        ON ba.id = pm.browser_account_id
      LEFT JOIN platform_accounts pa
        ON pa.id = pm.platform_account_id
      LEFT JOIN platform_thread_metadata ptm
        ON ptm.browser_account_id = pm.browser_account_id
       AND ptm.thread_id = pm.thread_id
       AND ptm.platform = pm.platform
      WHERE ${whereClauses}
      ORDER BY pm.sent_at DESC
      LIMIT ?
    `;

    const messages = await query<MessageRow>(sql, params);
    return NextResponse.json({ success: true, messages });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API /api/messages] ❌', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────
// POST /api/messages/read
// Body: { threadId, browserAccountId }
// Marks all messages in a thread as read (sets is_read = 1)
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { threadId, browserAccountId } = await req.json() as PostBody;
    if (!threadId) {
      return NextResponse.json({ success: false, error: 'threadId required' }, { status: 400 });
    }

    try {
      const params: unknown[] = [threadId];
      let sql = `UPDATE platform_messages SET is_read = 1 WHERE thread_id = ? AND is_read = 0`;
      if (browserAccountId) {
        sql += ' AND browser_account_id = ?';
        params.push(browserAccountId);
      }
      await execute(sql, params);
    } catch (colErr: unknown) {
      const msg = colErr instanceof Error ? colErr.message : String(colErr);
      console.warn('[API /api/messages POST] mark-as-read skipped:', msg);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
