import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/sessions/health
 *
 * Returns the latest health log per browser account so the UI
 * can show a green/red indicator next to each account.
 */
export async function GET() {
  try {
    // Latest health log per browser_account_id
    const rows = await query(`
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
    const accountsWithLogs = new Set((rows as any[]).map((r: any) => r.browser_account_id));
    const allAccounts = await query(`
      SELECT id AS browser_account_id, platform, account_name
      FROM browser_accounts
      WHERE is_active = 1 AND platform != 'whatsapp'
    `);

    const noLogAccounts = (allAccounts as any[])
      .filter((a: any) => !accountsWithLogs.has(a.browser_account_id))
      .map((a: any) => ({
        browser_account_id: a.browser_account_id,
        platform:           a.platform,
        account_name:       a.account_name,
        status:             'unknown',
        error_message:      null,
        checked_at:         null,
      }));

    return NextResponse.json({
      success: true,
      health: [...(rows as any[]), ...noLogAccounts],
    });
  } catch (err: any) {
    console.error('[API /sessions/health] ❌', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
