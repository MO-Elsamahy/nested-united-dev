import { Pool } from 'mysql2/promise';
import { IEventQueue, RawPlatformEvent, EventStatus } from './types';
import { IdempotencyManager } from './IdempotencyManager';

export interface IEventProcessor {
  process(event: RawPlatformEvent): Promise<void>;
}

export class MemoryEventQueue implements IEventQueue {
  private queue: string[] = [];
  private isProcessing = false;

  constructor(
    private pool: Pool,
    private processor: IEventProcessor
  ) {}

  async enqueue(event: RawPlatformEvent): Promise<string> {
    const eventId = IdempotencyManager.generateEventId(event);
    event.id = eventId;

    try {
      // 1. Insert into DB to track it, relying on UNIQUE KEY uk_event_id to catch duplicates
      await this.pool.execute(
        `INSERT INTO platform_events 
          (id, browser_account_id, platform, operation_name, timestamp, status, payload) 
         VALUES (?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          eventId,
          event.accountId,
          event.platform,
          event.operationName,
          event.timestamp || new Date().toISOString(),
          JSON.stringify(event.payload)
        ]
      );
      
      // 2. Add to in-memory queue
      this.queue.push(eventId);
      console.log(`[EventQueue] 📥 Enqueued event ${eventId} (${event.operationName})`);
      
      // 3. Trigger processing asynchronously without awaiting
      this.triggerProcessing();
      
      return eventId;
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        console.log(`[EventQueue] ⏭️ Ignored duplicate event ${eventId}`);
        return eventId;
      }
      console.error(`[EventQueue] ❌ Failed to enqueue event ${eventId}:`, e.message);
      throw e;
    }
  }

  private async triggerProcessing() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      while (await this.processNext()) {
        // continue processing until queue is empty
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async processNext(): Promise<boolean> {
    const eventId = this.queue.shift();
    if (!eventId) return false;

    // Fetch the raw event from the DB
    const [rows]: any = await this.pool.execute(
      `SELECT * FROM platform_events WHERE id = ? AND status = 'PENDING' LIMIT 1`,
      [eventId]
    );

    if (!rows || rows.length === 0) return true; // Already processed or not found
    
    const dbEvent = rows[0];
    const rawEvent: RawPlatformEvent = {
      id: dbEvent.id,
      accountId: dbEvent.browser_account_id,
      platform: dbEvent.platform as any,
      operationName: dbEvent.operation_name,
      timestamp: dbEvent.timestamp,
      url: '', // url and headers not stored to save space, not strictly needed for parsing
      headers: {},
      payload: JSON.parse(dbEvent.payload)
    };

    try {
      // Delegate to the processor (which contains Registry + DB persistence)
      await this.processor.process(rawEvent);
      
      // Mark as PROCESSED
      await this.updateStatus(eventId, 'PROCESSED');
      console.log(`[EventQueue] ✅ Processed event ${eventId}`);
    } catch (e: any) {
      // Mark as FAILED
      await this.updateStatus(eventId, 'FAILED', e.message);
      console.error(`[EventQueue] ❌ Failed to process event ${eventId}:`, e);
    }

    return true;
  }

  size(): number {
    return this.queue.length;
  }

  private async updateStatus(eventId: string, status: EventStatus, errorMessage?: string) {
    await this.pool.execute(
      `UPDATE platform_events SET status = ?, error_message = ? WHERE id = ?`,
      [status, errorMessage || null, eventId]
    );
  }
}
