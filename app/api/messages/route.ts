import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

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
      whereClauses += ' AND ptm.browser_account_id = ?';
      params.push(accountId);
    }

    if (platform && platform !== 'all') {
      whereClauses += ' AND ptm.platform = ?';
      params.push(platform);
    }

    // Add limit at the end
    params.push(limit);

    const sql = `
      WITH RankedMessages AS (
        SELECT 
          *,
          ROW_NUMBER() OVER(PARTITION BY browser_account_id, thread_id ORDER BY COALESCE(NULLIF(sent_at, '0000-00-00 00:00:00'), created_at) DESC, id DESC) as rn
        FROM platform_messages
      )
      SELECT
        COALESCE(pm.id, ptm.id) AS id,
        ptm.browser_account_id  AS platform_account_id,
        ptm.platform,
        ptm.thread_id,
        pm.platform_msg_id,
        COALESCE(NULLIF(ptm.guest_name, ''), NULLIF(pm.guest_name, ''), 'Guest') AS guest_name,
        pm.sender_name,
        pm.message_text,
        pm.is_from_me,
        COALESCE(
          NULLIF(ptm.last_message_timestamp, '0000-00-00 00:00:00'), 
          NULLIF(pm.sent_at, '0000-00-00 00:00:00'), 
          pm.created_at,
          ptm.updated_at
        ) AS sent_at,
        COALESCE(
          NULLIF(ptm.last_message_timestamp, '0000-00-00 00:00:00'), 
          NULLIF(pm.sent_at, '0000-00-00 00:00:00'), 
          pm.created_at,
          ptm.updated_at
        ) AS received_at,
        pm.raw_data,
        ba.account_name
      FROM platform_thread_metadata ptm
      LEFT JOIN browser_accounts ba
        ON ba.id = ptm.browser_account_id
      LEFT JOIN RankedMessages pm
        ON  pm.browser_account_id = ptm.browser_account_id
        AND pm.thread_id = ptm.thread_id
        AND pm.platform = ptm.platform
        AND pm.rn = 1
      WHERE (${whereClauses})
      ORDER BY COALESCE(
          NULLIF(ptm.last_message_timestamp, '0000-00-00 00:00:00'), 
          NULLIF(pm.sent_at, '0000-00-00 00:00:00'), 
          pm.created_at,
          ptm.updated_at
        ) DESC
      LIMIT ?
    `;

    const messages = await query<MessageRow>(sql, params);
    
    console.log(`\n\x1b[32m=== DEBUG STAGE 5 (API) ===\x1b[0m`);
    console.log(`[DEBUG 5] Final SQL: \n${sql}`);
    console.log(`[DEBUG 5] Returned threads count: ${messages.length}`);
    const last20 = messages.slice(0, 20);
    console.log(`[DEBUG 5] Last 20 Thread IDs: ${last20.map(m => m.thread_id).join(', ')}`);
    console.log(`[DEBUG 5] Last Message Date per Thread (Top 5):`, last20.slice(0, 5).map(m => ({ thread_id: m.thread_id, date: m.sent_at })));

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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

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
