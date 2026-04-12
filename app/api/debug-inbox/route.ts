import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const conn = await pool.getConnection();
  try {
    const [tables]: any = await conn.execute(`SHOW TABLES LIKE 'platform_messages'`);
    const [accounts]: any = await conn.execute(
      `SELECT id, platform, account_name, session_partition, platform_user_id, is_active 
       FROM browser_accounts ORDER BY platform`
    );
    const [msgCounts]: any = await conn.execute(
      `SELECT platform, COUNT(*) as cnt FROM platform_messages GROUP BY platform`
    );
    const [recentMsgs]: any = await conn.execute(
      `SELECT platform, platform_account_id, guest_name, message_text, sent_at, created_at
       FROM platform_messages ORDER BY created_at DESC LIMIT 10`
    );
    const [insertTest]: any = await conn.execute(
      `SELECT @@sql_mode as sql_mode`
    );

    return NextResponse.json({
      tableExists: tables.length > 0,
      accounts,
      messageCounts: msgCounts,
      recentMessages: recentMsgs,
      sqlMode: insertTest[0]?.sql_mode,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    conn.release();
  }
}
