import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
  const conn = await pool.getConnection();
  try {
    const [tables] = await conn.execute<RowDataPacket[]>(`SHOW TABLES LIKE 'platform_messages'`);
    const [accounts] = await conn.execute<RowDataPacket[]>(
      `SELECT id, platform, account_name, session_partition, platform_user_id, is_active 
       FROM browser_accounts ORDER BY platform`
    );
    const [msgCounts] = await conn.execute<RowDataPacket[]>(
      `SELECT platform, COUNT(*) as cnt FROM platform_messages GROUP BY platform`
    );
    const [recentMsgs] = await conn.execute<RowDataPacket[]>(
      `SELECT platform, platform_account_id, guest_name, message_text, sent_at, created_at
       FROM platform_messages ORDER BY created_at DESC LIMIT 10`
    );
    const [insertTest] = await conn.execute<RowDataPacket[]>(
      `SELECT @@sql_mode as sql_mode`
    );

    return NextResponse.json({
      tableExists: tables.length > 0,
      accounts,
      messageCounts: msgCounts,
      recentMessages: recentMsgs,
      sqlMode: insertTest[0]?.sql_mode,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    conn.release();
  }
}
