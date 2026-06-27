import { PoolConnection } from 'mysql2/promise';

export interface IThreadMetadata {
  id?: string;
  browserAccountId: string;
  platform: string;
  threadId: string;
  guestName?: string;
  unitId?: string;
  chaletId?: string;
  reservationId?: string;
  
  // Sync tracking
  lastMessageId?: string | null;
  lastMessageTimestamp?: Date | null;
  messageCount?: number;
  serverUpdatedAt?: Date | null;
  etag?: string | null;
  threadVersion?: string | null;
  
  // Operational status
  lastSyncedAt?: Date | null;
  syncStatus: 'synced' | 'pending_initial_sync' | 'syncing' | 'failed';
  lastError?: string | null;
  metadataJson?: string | null;
  updatedAt?: Date;
}

export interface IThreadMetadataRepository {
  findByThreadId(accountId: string, platform: string, threadId: string): Promise<IThreadMetadata | null>;
  upsert(metadata: IThreadMetadata): Promise<void>;
  updateSyncStatus(id: string, status: IThreadMetadata['syncStatus'], error?: string | null): Promise<void>;
}

export interface IMessageRepository {
  saveMessage(params: {
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
  }): Promise<boolean>;
  messageExists(platform: string, threadId: string, msgId: string): Promise<boolean>;
}

export interface ISyncStrategy {
  readonly platform: string;
  initialSync(account: any, connection: PoolConnection): Promise<void>;
  incrementalSync(account: any, connection: PoolConnection): Promise<void>;
}
