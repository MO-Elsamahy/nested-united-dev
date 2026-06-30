import { Pool } from 'mysql2/promise';
import { NormalizedEvent } from '../events/types';
import * as crypto from 'crypto';

export class PersistenceService {
  constructor(private pool: Pool) {}

  async persistEvent(event: NormalizedEvent): Promise<void> {
    for (const thread of event.threads) {
      await this.persistThread(event.accountId, event.platform, thread);
      for (const msg of thread.messages) {
        await this.persistMessage(event.accountId, event.platform, msg);
      }
    }
  }

  private async persistThread(accountId: string, platform: string, thread: any) {
    await this.pool.execute(`
      INSERT INTO platform_thread_metadata
        (id, browser_account_id, platform, thread_id, guest_name, last_message_id, last_message_timestamp, server_updated_at, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        guest_name = IF(VALUES(guest_name) != 'Guest' AND VALUES(guest_name) != '', VALUES(guest_name), guest_name),
        last_message_id = IF(VALUES(last_message_timestamp) >= last_message_timestamp OR last_message_timestamp IS NULL, VALUES(last_message_id), last_message_id),
        last_message_timestamp = IF(VALUES(last_message_timestamp) >= last_message_timestamp OR last_message_timestamp IS NULL, VALUES(last_message_timestamp), last_message_timestamp),
        server_updated_at = VALUES(server_updated_at),
        metadata_json = IF(VALUES(last_message_timestamp) >= last_message_timestamp OR last_message_timestamp IS NULL, VALUES(metadata_json), metadata_json)
    `, [
      crypto.randomUUID(),
      accountId,
      platform,
      thread.threadId,
      thread.guestName,
      thread.lastMessageId,
      thread.lastMessageTimestamp,
      thread.serverUpdatedAt,
      JSON.stringify(thread.metadataJson)
    ]);
  }

  private async persistMessage(accountId: string, platform: string, msg: any) {
    await this.pool.execute(`
      INSERT INTO platform_messages
        (id, browser_account_id, platform_account_id, platform, thread_id, platform_msg_id,
         guest_name, sender_name, message_text, is_from_me, sent_at, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        message_text = IF(VALUES(sent_at) >= sent_at OR MD5(VALUES(message_text)) != MD5(message_text), VALUES(message_text), message_text),
        guest_name = IF(VALUES(guest_name) != 'Guest' AND VALUES(guest_name) != '', VALUES(guest_name), guest_name),
        sender_name = IF(VALUES(sender_name) IS NOT NULL AND VALUES(sender_name) != '', VALUES(sender_name), sender_name),
        is_from_me = IF(VALUES(sent_at) >= sent_at OR MD5(VALUES(message_text)) != MD5(message_text), VALUES(is_from_me), is_from_me),
        sent_at = IF(VALUES(sent_at) >= sent_at, VALUES(sent_at), sent_at),
        raw_data = IF(VALUES(sent_at) >= sent_at OR MD5(VALUES(message_text)) != MD5(message_text), VALUES(raw_data), raw_data)
    `, [
      crypto.randomUUID(),
      accountId,
      accountId, // Using browser account as platform account for now
      platform,
      msg.threadId,
      msg.platformMsgId,
      msg.guestName,
      msg.senderName || null,
      msg.messageText,
      msg.isFromMe ? 1 : 0,
      msg.sentAt,
      JSON.stringify(msg.rawData)
    ]);
  }
}
