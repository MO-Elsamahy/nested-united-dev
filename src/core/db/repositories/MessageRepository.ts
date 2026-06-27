import { IMessageRepository } from '../../interfaces/ISyncEngine';
import * as crypto from 'crypto';

export class MessageRepository implements IMessageRepository {
  constructor(private db: any) {}

  async saveMessage(params: {
    accountId: number;
    platformAccountId: string | null;
    platform: string;
    threadId: string;
    msgId: string;
    guestName: string;
    text: string;
    isFromMe: number;
    sentAt: Date;
    rawData: string;
  }): Promise<boolean> {
    try {
      console.log(`\n\x1b[36m=== DEBUG STAGE 3 (Repository) ===\x1b[0m`);
      console.log(`[DEBUG 3] Executing query for Message ID: ${params.msgId}, Thread ID: ${params.threadId}, Sent At: ${params.sentAt}`);
      const [result]: any = await this.db.execute(`
        INSERT INTO platform_messages
          (id, browser_account_id, platform_account_id, platform, thread_id, platform_msg_id,
           guest_name, message_text, is_from_me, sent_at, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          message_text = VALUES(message_text),
          guest_name   = IF(VALUES(guest_name) != 'Guest' AND VALUES(guest_name) != '', VALUES(guest_name), guest_name),
          raw_data     = VALUES(raw_data),
          is_from_me   = VALUES(is_from_me),
          sent_at      = VALUES(sent_at)
      `, [
        crypto.randomUUID(),
        params.accountId,
        params.platformAccountId,
        params.platform,
        params.threadId,
        params.msgId,
        params.guestName,
        params.text,
        params.isFromMe,
        params.sentAt,
        params.rawData
      ]);
      console.log(`[DEBUG 3] Query executed. Affected rows: ${result.affectedRows}. (1 = INSERT, 2 = UPDATE, 0 = UNCHANGED)`);
      
      // Stage 4 Logging
      console.log(`\n\x1b[33m=== DEBUG STAGE 4 (Verification Query) ===\x1b[0m`);
      const [verifyRows]: any = await this.db.execute(
        `SELECT id, thread_id, sent_at FROM platform_messages WHERE platform_msg_id = ?`,
        [params.msgId]
      );
      if (verifyRows.length > 0) {
        console.log(`[DEBUG 4] VERIFIED IN DB! Message found. Sent At in DB: ${verifyRows[0].sent_at}`);
      } else {
        console.log(`[DEBUG 4] ❌ ERROR: Message NOT FOUND in DB immediately after save!`);
      }

      return result.affectedRows > 0;
    } catch (e: any) {
      console.warn(`[MessageRepo] ⚠️ Save failed for message ${params.msgId}:`, e.message);
      return false;
    }
  }

  async messageExists(platform: string, threadId: string, msgId: string): Promise<boolean> {
    const [rows]: any = await this.db.execute(
      `SELECT 1 FROM platform_messages WHERE platform = ? AND thread_id = ? AND platform_msg_id = ? LIMIT 1`,
      [platform, threadId, msgId]
    );
    return rows && rows.length > 0;
  }
}
