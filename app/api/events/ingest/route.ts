import { NextRequest, NextResponse } from 'next/server';
import { getEventQueue } from '@/src/core/events';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const rawEvent = await req.json();

    if (!rawEvent || !rawEvent.accountId || !rawEvent.platform || !rawEvent.operationName) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const queue = getEventQueue();
    const eventId = await queue.enqueue(rawEvent);

    return NextResponse.json({ success: true, eventId, queued: true });
  } catch (e: any) {
    console.error('[EventIngestAPI] ❌ Failed to ingest event:', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
