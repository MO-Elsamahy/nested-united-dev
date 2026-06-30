import crypto from 'crypto';
import { RawPlatformEvent } from './types';

export class IdempotencyManager {
  /**
   * Generates a unique, deterministic hash for an event to prevent duplicate processing.
   * Uses accountId, platform, operationName, and a hash of the payload.
   */
  static generateEventId(event: RawPlatformEvent): string {
    const payloadStr = typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload || {});
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
    
    // For incoming events, timestamp might be the exact same if polled quickly, but payload is identical.
    // For outgoing, we rely on payload hash.
    const rawId = `${event.accountId}:${event.platform}:${event.operationName}:${payloadHash}`;
    
    return crypto.createHash('sha256').update(rawId).digest('hex');
  }
}
