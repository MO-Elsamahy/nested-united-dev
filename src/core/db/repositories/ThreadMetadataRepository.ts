import { IThreadMetadata, IThreadMetadataRepository } from '../../interfaces/ISyncEngine';
import * as crypto from 'crypto';

export class ThreadMetadataRepository implements IThreadMetadataRepository {
  constructor(private db: any) {}

  async findByThreadId(accountId: string, platform: string, threadId: string): Promise<IThreadMetadata | null> {
    const [rows]: any = await this.db.execute(
      `SELECT * FROM platform_thread_metadata 
       WHERE browser_account_id = ? AND platform = ? AND thread_id = ?`,
      [accountId, platform, threadId]
    );

    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      browserAccountId: r.browser_account_id,
      platform: r.platform,
      threadId: r.thread_id,
      guestName: r.guest_name,
      unitId: r.unit_id,
      chaletId: r.chalet_id,
      reservationId: r.reservation_id,
      lastMessageId: r.last_message_id,
      lastMessageTimestamp: r.last_message_timestamp ? new Date(r.last_message_timestamp) : null,
      messageCount: r.message_count,
      serverUpdatedAt: r.server_updated_at ? new Date(r.server_updated_at) : null,
      etag: r.etag,
      threadVersion: r.thread_version,
      lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at) : null,
      syncStatus: r.sync_status,
      lastError: r.last_error,
      metadataJson: r.metadata_json,
      updatedAt: r.updated_at ? new Date(r.updated_at) : undefined
    };
  }

  async upsert(m: IThreadMetadata): Promise<void> {
    const id = m.id || crypto.randomUUID();
    const lastMessageTimestamp = m.lastMessageTimestamp ? new Date(m.lastMessageTimestamp) : null;
    const serverUpdatedAt = m.serverUpdatedAt ? new Date(m.serverUpdatedAt) : null;
    const lastSyncedAt = m.lastSyncedAt ? new Date(m.lastSyncedAt) : null;

    await this.db.execute(
      `INSERT INTO platform_thread_metadata
        (id, browser_account_id, platform, thread_id, guest_name, unit_id, chalet_id, reservation_id,
         last_message_id, last_message_timestamp, message_count, server_updated_at, etag, thread_version,
         last_synced_at, sync_status, last_error, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         guest_name = VALUES(guest_name),
         unit_id = COALESCE(VALUES(unit_id), unit_id),
         chalet_id = COALESCE(VALUES(chalet_id), chalet_id),
         reservation_id = COALESCE(VALUES(reservation_id), reservation_id),
         last_message_id = VALUES(last_message_id),
         last_message_timestamp = VALUES(last_message_timestamp),
         message_count = VALUES(message_count),
         server_updated_at = VALUES(server_updated_at),
         etag = VALUES(etag),
         thread_version = VALUES(thread_version),
         last_synced_at = VALUES(last_synced_at),
         sync_status = VALUES(sync_status),
         last_error = VALUES(last_error),
         metadata_json = VALUES(metadata_json)`,
      [
        id, m.browserAccountId, m.platform, m.threadId, m.guestName || null, m.unitId || null, m.chaletId || null, m.reservationId || null,
        m.lastMessageId || null, lastMessageTimestamp, m.messageCount || 0, serverUpdatedAt, m.etag || null, m.threadVersion || null,
        lastSyncedAt, m.syncStatus, m.lastError || null, m.metadataJson || null
      ]
    );
  }

  async updateSyncStatus(id: string, status: IThreadMetadata['syncStatus'], error?: string | null): Promise<void> {
    await this.db.execute(
      `UPDATE platform_thread_metadata SET sync_status = ?, last_error = ? WHERE id = ?`,
      [status, error || null, id]
    );
  }
}
