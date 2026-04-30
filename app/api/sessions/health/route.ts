import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * can show a green/red indicator next to each account.
 */

interface SessionHealthRow {
  browser_account_id: string;
  platform: string;
  status: string;
  error_message: string | null;
  checked_at: string | null;
  account_name: string;
}

export async function GET() {
  try {
    // Latest health log per browser_account_id
    const rows = await query<SessionHealthRow>(`
      SELECT
        shl.browser_account_id,
        shl.platform,
        shl.status,
        shl.error_message,
        shl.checked_at,
        ba.account_name
      FROM session_health_logs shl
      INNER JOIN (
        SELECT browser_account_id, MAX(checked_at) AS latest
        FROM session_health_logs
        GROUP BY browser_account_id
      ) latest_log
        ON  shl.browser_account_id = latest_log.browser_account_id
        AND shl.checked_at         = latest_log.latest
      LEFT JOIN browser_accounts ba
        ON ba.id = shl.browser_account_id
      ORDER BY shl.checked_at DESC
    `);

    // Also include accounts with no health log yet (they may be newly added)
    const accountsWithLogs = new Set(rows.map((r) => r.browser_account_id));
    const allAccounts = await query<Pick<SessionHealthRow, 'browser_account_id' | 'platform' | 'account_name'>>(`
      SELECT id AS browser_account_id, platform, account_name
      FROM browser_accounts
      WHERE is_active = 1 AND platform != 'whatsapp'
    `);

    const noLogAccounts: SessionHealthRow[] = allAccounts
      .filter((a) => !accountsWithLogs.has(a.browser_account_id))
      .map((a) => ({
        browser_account_id: a.browser_account_id,
        platform:           a.platform,
        account_name:       a.account_name,
        status:             'unknown',
        error_message:      null,
        checked_at:         null,
      }));

    return NextResponse.json({
      success: true,
      health: [...rows, ...noLogAccounts],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API /sessions/health] ❌', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
