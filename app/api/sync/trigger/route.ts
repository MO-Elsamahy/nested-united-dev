import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import mysql from 'mysql2/promise';
import { IncrementalSyncEngine } from '@/src/core/polling/IncrementalSyncEngine';

export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sync/trigger
//
// Triggered by the Electron main process immediately after a message is sent
// from the webview (either via send-message IPC or CDP outgoing-message-sent).
//
// Body: { accountId: string; threadId: string; platform: 'airbnb' | 'gathern' }
//
// Behaviour:
//   1. Validates the browser_account exists and is active.
//   2. Calls engine.syncSingleThread() — which fetches the thread's latest
//      messages from the platform API and saves them to the DB.
//   3. Returns immediately. The React UI will pick up the new data on its
//      next 5-second polling cycle (or sooner if the caller forces a refresh).
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerBody {
  accountId: string;
  threadId: string;
  platform: 'airbnb' | 'gathern';
}

// Lazy singleton pool — reuse if the route is called frequently.
let _pool: mysql.Pool | null = null;
function getPool(): mysql.Pool {
  if (!_pool) {
    _pool = mysql.createPool({
      host:     process.env.DB_HOST     || '127.0.0.1',
      port:     parseInt(process.env.DB_PORT || '3306', 10),
      user:     process.env.DB_USER     || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME     || 'rentals_dashboard',
      waitForConnections: true,
      connectionLimit: 3,
    });
  }
  return _pool;
}

export async function POST(req: NextRequest) {

  let body: TriggerBody;
  try {
    body = await req.json() as TriggerBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { accountId, threadId, platform } = body;

  if (!accountId || !threadId || !platform) {
    return NextResponse.json(
      { error: 'accountId, threadId, and platform are required' },
      { status: 400 }
    );
  }

  if (platform !== 'airbnb' && platform !== 'gathern') {
    return NextResponse.json(
      { error: `Unknown platform: ${platform}` },
      { status: 400 }
    );
  }

  console.log(`\x1b[35m[OutgoingSync] 🔄 Forced sync triggered — account=${accountId} thread=${threadId} platform=${platform}\x1b[0m`);

  try {
    const pool = getPool();

    // Verify the account exists and is active
    const [rows]: any = await pool.execute(
      `SELECT id FROM browser_accounts WHERE id = ? AND is_active = 1 LIMIT 1`,
      [accountId]
    );
    if (!rows || rows.length === 0) {
      console.warn(`[OutgoingSync] ⚠️ Account ${accountId} not found or inactive — skipping forced sync`);
      return NextResponse.json(
        { success: false, error: `Account ${accountId} not found or inactive` },
        { status: 404 }
      );
    }

    const engine = new IncrementalSyncEngine(pool);

    // Fire-and-forget with a 30-second timeout guard.
    const syncPromise = engine.syncSingleThread(accountId, platform, threadId);
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('syncSingleThread timed out after 30s')), 30_000)
    );

    // Run in background — don't await in the response path
    Promise.race([syncPromise, timeoutPromise]).then(() => {
      console.log(`\x1b[32m[OutgoingSync] ✅ Forced sync complete — thread=${threadId}\x1b[0m`);
    }).catch((err: Error) => {
      console.error(`[OutgoingSync] ❌ Forced sync failed for thread ${threadId}:`, err.message);
    });

    return NextResponse.json({ success: true, message: `Sync triggered for thread ${threadId}` });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[OutgoingSync] ❌ Error:`, msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
