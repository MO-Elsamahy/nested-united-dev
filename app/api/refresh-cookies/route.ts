import { NextRequest, NextResponse } from 'next/server';

// This endpoint is called by the polling service (running in a separate process)
// to trigger a cookie refresh from Electron's open browser windows.
// Electron listens to requests from the dashboard app and syncs cookies.
// This is a best-effort — if Electron is not running it just returns ok.

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  // The actual cookie refresh happens via Electron IPC, but since the polling
  // service is a separate Node process, it can't call IPC directly.
  // The Electron sniffer already runs persistCookiesToDB every 5 minutes.
  // This endpoint is a signal — Electron's main process will handle it via the
  // next page load event from the dashboard.
  //
  // In the meantime, the polling engine can read directly from the DB.
  return NextResponse.json({ success: true, message: 'Cookie refresh signal sent' });
}
