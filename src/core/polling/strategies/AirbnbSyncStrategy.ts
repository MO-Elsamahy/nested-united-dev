import { PoolConnection } from 'mysql2/promise';
import { ISyncStrategy, IThreadMetadata } from '../../interfaces/ISyncEngine';
import { ThreadMetadataRepository } from '../../db/repositories/ThreadMetadataRepository';
import { MessageRepository } from '../../db/repositories/MessageRepository';

export class AirbnbSyncStrategy implements ISyncStrategy {
  readonly platform = 'airbnb';

  constructor(
    private client: any,
    private threadParser: any,
    private paginator: any,
    private threadRepo: ThreadMetadataRepository,
    private messageRepo: MessageRepository
  ) {}

  async initialSync(account: any, connection: PoolConnection): Promise<void> {
    console.log(`\x1b[35m[Sync] 🚀 Initial Sync started for Airbnb Account: ${account.account_name}\x1b[0m`);
    let page = 1;
    let nextCursor: string | undefined;
    let totalSyncedThreads = 0;

    const platformUserId = account.platform_user_id;
    const userIdB64 = platformUserId
      ? Buffer.from('Viewer:' + platformUserId).toString('base64')
      : undefined;

    // Load up to 10 pages for initial synchronization
    while (page <= 10) {
      const result = await this.fetchInboxPage(account, userIdB64, nextCursor);
      if (!result || result.threads.length === 0) {
        break;
      }

      console.log(`[Sync] Initial Sync page ${page}: Found ${result.threads.length} threads`);

      for (const rawThread of result.threads) {
        const parsed = this.threadParser.parse(rawThread, { 
          platform: 'airbnb', 
          accountId: account.id,
          hostUserId: platformUserId
        });
        if (!parsed || !parsed.threadId) continue;

        const metaId = `${account.id}-airbnb-${parsed.threadId}`;
        const meta: IThreadMetadata = {
          id: metaId,
          browserAccountId: account.id,
          platform: 'airbnb',
          threadId: parsed.threadId,
          guestName: parsed.guestName || 'Guest',
          unitId: parsed.listingId || undefined,
          reservationId: parsed.reservationId || undefined,
          syncStatus: 'pending_initial_sync',
          metadataJson: JSON.stringify(rawThread)
        };

        await this.threadRepo.upsert(meta);

        try {
          // Fetch full messages (up to 50 latest)
          const messages = await this.fetchThreadMessages(account, parsed.threadId);
          for (const msg of messages) {
            await this.messageRepo.saveMessage({
              accountId: account.id,
              platformAccountId: platformUserId || null,
              platform: 'airbnb',
              threadId: parsed.threadId,
              msgId: msg.id,
              guestName: parsed.guestName,
              text: msg.text,
              isFromMe: msg.isFromHost ? 1 : 0,
              sentAt: msg.timestamp,
              rawData: JSON.stringify(msg.rawData)
            });
          }

          // Mark metadata as fully synced
          meta.syncStatus = 'synced';
          meta.lastSyncedAt = new Date();
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            meta.lastMessageId = lastMsg.id;
            meta.lastMessageTimestamp = lastMsg.timestamp;
            meta.messageCount = messages.length;
          }
          await this.threadRepo.upsert(meta);
          totalSyncedThreads++;
          console.log(`[Sync]   ✅ Initial Sync thread ${parsed.threadId} complete (${messages.length} messages)`);
        } catch (e: any) {
          console.error(`[Sync]   ❌ Initial Sync failed for thread ${parsed.threadId}: ${e.message}`);
          await this.threadRepo.updateSyncStatus(metaId, 'failed', e.message);
        }
      }

      if (result.pageInfo.hasNextPage && result.pageInfo.nextCursor) {
        nextCursor = result.pageInfo.nextCursor;
        page++;
      } else {
        break;
      }
    }

    console.log(`\x1b[32m[Sync] ✅ Initial Sync complete for Airbnb Account ${account.account_name}: ${totalSyncedThreads} threads synchronized\x1b[0m`);
  }

  async incrementalSync(account: any, connection: PoolConnection): Promise<void> {
    console.log(`[Sync] 🔄 Incremental Sync started for Airbnb Account: ${account.account_name}`);
    
    const platformUserId = account.platform_user_id;
    const userIdB64 = platformUserId
      ? Buffer.from('Viewer:' + platformUserId).toString('base64')
      : undefined;

    const MAX_INCREMENTAL_PAGES = 3;
    let currentPage = 1;
    let nextCursor: string | undefined;
    let checkedCount = 0;
    let updatedCount = 0;

    while (currentPage <= MAX_INCREMENTAL_PAGES) {
      const result = await this.fetchInboxPage(account, userIdB64, nextCursor);
      if (!result || result.threads.length === 0) {
        console.log(`[Sync] Inbox page ${currentPage} empty or failed for ${account.account_name}`);
        break;
      }

      console.log(`\n\x1b[35m=== DEBUG STAGE 1 (API Response - Airbnb) ===\x1b[0m`);
      console.log(`[DEBUG 1] Fetched Inbox Page ${currentPage}. Total Threads in Response: ${result.threads.length}`);

      let newOnPage = 0;
      let checkedOnPage = 0;

      for (const rawThread of result.threads) {
        const parsed = this.threadParser.parse(rawThread, { 
          platform: 'airbnb', 
          accountId: account.id,
          hostUserId: platformUserId
        });
        if (!parsed || !parsed.threadId) continue;

        checkedOnPage++;
        checkedCount++;
        const localMeta = await this.threadRepo.findByThreadId(account.id, 'airbnb', parsed.threadId);
        
        const serverLastMsgId = this.extractServerLastMessageId(rawThread);
        const serverLastMsgTimestamp = this.extractServerLastMessageTimestamp(rawThread);

        // Condition: needs sync if not in DB, failed, or server message ID/timestamp differs
        const needsSync = !localMeta ||
                          localMeta.syncStatus !== 'synced' ||
                          (serverLastMsgId
                            ? localMeta.lastMessageId !== serverLastMsgId
                            : (serverLastMsgTimestamp && localMeta.lastMessageTimestamp?.getTime() !== serverLastMsgTimestamp.getTime()));

        if (!localMeta) newOnPage++;

        if (!needsSync) {
          // Unchanged thread: update lastSyncedAt and skip fetching detailed history
          const meta = this.mapToMetadata(parsed, account.id, rawThread);
          meta.syncStatus = 'synced';
          meta.lastSyncedAt = new Date();
          meta.lastMessageId = localMeta.lastMessageId;
          meta.lastMessageTimestamp = localMeta.lastMessageTimestamp;
          meta.messageCount = localMeta.messageCount;
          await this.threadRepo.upsert(meta);
          continue;
        }

        console.log(`\n\x1b[35m=== DEBUG STAGE 1 & 2 (Airbnb) ===\x1b[0m`);
        console.log(`[DEBUG 1] Received response for thread: ${parsed.threadId}. Server Last Msg ID: ${serverLastMsgId}, Timestamp: ${serverLastMsgTimestamp}`);
        
        try {
          const messages = await this.fetchThreadMessages(account, parsed.threadId);
          
          console.log(`[DEBUG 2] After Parser. Parsed messages count: ${messages.length}`);
          if (messages.length > 0) {
            console.log(`[DEBUG 2] First Message: ID=${messages[0].id}, Text=${messages[0].text.substring(0, 20)}, SentAt=${messages[0].timestamp}`);
            const lastMsg = messages[messages.length - 1];
            console.log(`[DEBUG 2] Last Message: ID=${lastMsg.id}, Text=${lastMsg.text.substring(0, 20)}, SentAt=${lastMsg.timestamp}`);
          }
          
          for (const msg of messages) {
            await this.messageRepo.saveMessage({
              accountId: account.id,
              platformAccountId: platformUserId || null,
              platform: 'airbnb',
              threadId: parsed.threadId,
              msgId: msg.id,
              guestName: parsed.guestName,
              text: msg.text,
              isFromMe: msg.isFromHost ? 1 : 0,
              sentAt: msg.timestamp,
              rawData: JSON.stringify(msg.rawData)
            });
          }

          const meta = this.mapToMetadata(parsed, account.id, rawThread);
          meta.syncStatus = 'synced';
          meta.lastSyncedAt = new Date();
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            meta.lastMessageId = lastMsg.id;
            meta.lastMessageTimestamp = lastMsg.timestamp;
            meta.messageCount = messages.length;
          }
          await this.threadRepo.upsert(meta);
          updatedCount++;
          console.log(`[Sync]   ✅ Updated thread ${parsed.threadId}`);
        } catch (err: any) {
          console.error(`[Sync]   ❌ Thread ${parsed.threadId} detail sync failed: ${err.message}`);
          const metaId = `${account.id}-airbnb-${parsed.threadId}`;
          await this.threadRepo.updateSyncStatus(metaId, 'failed', err.message);
        }
      }

      // "New thread continuation" rule: if ALL threads on this page were new,
      // there may be more new threads on the next page — keep going.
      const allNew = checkedOnPage > 0 && newOnPage === checkedOnPage;
      if (allNew && result.pageInfo.hasNextPage && result.pageInfo.nextCursor && currentPage < MAX_INCREMENTAL_PAGES) {
        console.log(`[Sync] Page ${currentPage} was entirely new threads (${newOnPage}/${checkedOnPage}). Fetching page ${currentPage + 1}...`);
        nextCursor = result.pageInfo.nextCursor;
        currentPage++;
      } else {
        // Found at least one known thread — no need to go deeper
        break;
      }
    }

    console.log(`\x1b[32m[Sync] ✅ Incremental Sync complete for ${account.account_name}: checked ${checkedCount} threads, updated ${updatedCount}\x1b[0m`);
  }


  async syncSingleThread(account: any, threadId: string, connection: PoolConnection): Promise<void> {
    console.log(`[Sync] ⚡ Targeted sync started for Airbnb Thread: ${threadId} (Account: ${account.account_name})`);
    
    const platformUserId = account.platform_user_id;
    const localMeta = await this.threadRepo.findByThreadId(account.id, 'airbnb', threadId);

    try {
      // 1) Ensure thread exists in DB immediately before fetching messages
      // This solves the disappearing-thread problem where the UI inbox query
      // requires the thread metadata row to exist.
      const initialMeta: IThreadMetadata = {
        id: localMeta?.id || `${account.id}-airbnb-${threadId}`,
        browserAccountId: account.id,
        platform: 'airbnb',
        threadId,
        guestName: localMeta?.guestName || 'Guest',
        unitId: localMeta?.unitId ?? undefined,
        reservationId: localMeta?.reservationId ?? undefined,
        syncStatus: 'syncing',
        lastSyncedAt: new Date(),
        lastMessageId: localMeta?.lastMessageId ?? undefined,
        lastMessageTimestamp: localMeta?.lastMessageTimestamp ?? undefined,
        messageCount: localMeta?.messageCount ?? 0,
      };
      await this.threadRepo.upsert(initialMeta);

      const messages = await this.fetchThreadMessages(account, threadId);
      
      for (const msg of messages) {
        await this.messageRepo.saveMessage({
          accountId: account.id,
          platformAccountId: platformUserId || null,
          platform: 'airbnb',
          threadId,
          msgId: msg.id,
          guestName: localMeta?.guestName || 'Guest',
          text: msg.text,
          isFromMe: msg.isFromHost ? 1 : 0,
          sentAt: msg.timestamp,
          rawData: JSON.stringify(msg.rawData)
        });
      }

      // Upsert the updated thread metadata
      const meta: IThreadMetadata = {
        id: localMeta?.id || `${account.id}-airbnb-${threadId}`,
        browserAccountId: account.id,
        platform: 'airbnb',
        threadId,
        guestName: localMeta?.guestName || 'Guest',
        unitId: localMeta?.unitId ?? undefined,
        reservationId: localMeta?.reservationId ?? undefined,
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
      };

      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        meta.lastMessageId = lastMsg.id;
        meta.lastMessageTimestamp = lastMsg.timestamp;
        meta.messageCount = messages.length;
      }
      
      await this.threadRepo.upsert(meta);
      console.log(`[Sync] ✅ Targeted sync complete for Airbnb Thread: ${threadId}`);
    } catch (err: any) {
      console.error(`[Sync] ❌ Targeted sync failed for Airbnb Thread: ${threadId}: ${err.message}`);
      const metaId = `${account.id}-airbnb-${threadId}`;
      await this.threadRepo.updateSyncStatus(metaId, 'failed', err.message);
    }
  }

  // ── Helper fetch methods ────────────────────────────────────────────────
  private async fetchInboxPage(account: any, userIdB64?: string, cursor?: string): Promise<{ threads: any[], pageInfo: any } | null> {
    const variables: Record<string, unknown> = {
      getParticipants: true,
      numRequestedThreads: 15,
      numPriorityThreads: 20,
      getPriorityInbox: false,
      useUserThreadTag: true,
      ...(userIdB64 ? { userId: userIdB64 } : {}),
      originType: "USER_INBOX",
      threadVisibility: "UNARCHIVED",
      threadTagFilters: [],
      priorityThreadTagFilters: [{ userThreadTagName: "priority" }],
      query: null,
      getLastReads: false,
      getThreadState: true,
      getInboxFields: true,
      getInboxOnlyFields: true,
      getMessageFields: false,
      getThreadOnlyFields: true,
      skipOldMessagePreviewFields: false
    };

    if (cursor) variables.afterCursor = cursor;

    const resp = await this.client.execute({
      platform: 'airbnb',
      operationName: 'ViaductInboxData',
      variables,
      cookies: account.cookies_json,
      apiKey: account.api_key_cache ?? undefined,
    });

    if (!resp.ok || !resp.data) {
      throw new Error(`Airbnb fetchInboxPage failed: HTTP ${resp.status}`);
    }

    const json = resp.data as Record<string, unknown>;
    const errors = json.errors as any[] | undefined;
    if (errors && errors.length > 0) {
      throw new Error(`Airbnb GraphQL Error: ${errors[0].message}`);
    }

    // Adaptively find threads list
    let threads: any[] = [];
    const knownPath = (json as any)?.data?.presentation?.inbox?.threads;
    if (Array.isArray(knownPath)) threads = knownPath;
    else if (Array.isArray(knownPath?.threadItems)) threads = knownPath.threadItems;
    else {
      threads = this.findThreadsRecursively(json) || [];
    }

    const pageInfo = this.paginator.detect(json);

    return { threads, pageInfo };
  }

  private async fetchThreadMessages(account: any, threadId: string): Promise<any[]> {
    const ctx = { platform: 'airbnb', accountId: account.id, hostUserId: account.platform_user_id };
    const globalThreadId = Buffer.from('MessageThread:' + threadId).toString('base64');
    
    const resp = await this.client.execute({
      platform: 'airbnb',
      operationName: 'ViaductGetThreadAndDataQuery',
      variables: {
        numRequestedMessages: 50, getThreadState: true, getParticipants: true,
        mockThreadIdentifier: null, mockMessageTestIdentifier: null,
        getLastReads: true, forceUgcTranslation: false, isNovaLite: false,
        globalThreadId, mockListFooterSlot: null, forceReturnAllReadReceipts: false,
        originType: 'USER_INBOX', getInboxFields: true, getInboxOnlyFields: false,
        getMessageFields: true, getThreadOnlyFields: true, skipOldMessagePreviewFields: false,
      },
      cookies: account.cookies_json,
    });

    if (!resp.ok || !resp.data) {
      throw new Error(`fetchThreadMessages failed for thread ${threadId}: HTTP ${resp.status}`);
    }

    const json = resp.data as any;
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Airbnb thread details GraphQL error: ${json.errors[0].message}`);
    }

    const threadRaw = json?.data?.presentation?.thread ?? json?.data?.threadData ?? json;
    return this.threadParser.extractAllMessages(threadRaw, ctx);
  }

  private findThreadsRecursively(obj: unknown, depth = 0): unknown[] | null {
    if (depth > 8 || !obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj) && obj.length > 0) {
      const first = obj[0] as any;
      if (first?.threadId || first?.id || first?.thread_id) return obj;
      if (first?.node && (first.node.threadId || first.node.id || first.node.thread_id)) {
        return obj.map((edge: any) => edge.node);
      }
    }
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = this.findThreadsRecursively(val, depth + 1);
      if (found) return found;
    }
    return null;
  }

  private mapToMetadata(parsed: any, accountId: string, rawThread: any): IThreadMetadata {
    return {
      id: `${accountId}-airbnb-${parsed.threadId}`,
      browserAccountId: accountId,
      platform: 'airbnb',
      threadId: parsed.threadId,
      guestName: parsed.guestName || 'Guest',
      unitId: parsed.listingId || undefined,
      reservationId: parsed.reservationId || undefined,
      syncStatus: 'synced',
      metadataJson: JSON.stringify(rawThread)
    };
  }

  private extractServerLastMessageId(rawThread: any): string | null {
    const node = rawThread.messages?.edges?.[0]?.node || rawThread.messages?.[0];
    return node?.id || null;
  }

  private extractServerLastMessageTimestamp(rawThread: any): Date | null {
    const node = rawThread.messages?.edges?.[0]?.node || rawThread.messages?.[0];
    const ms = node?.createdAtMs || node?.createdAt;
    if (!ms) return null;
    
    // Check if it's a numeric unix timestamp
    if (!isNaN(Number(ms))) {
        const val = Number(ms);
        return new Date(val > 1e12 ? val : val * 1000);
    }
    
    // Check if it's a date string (e.g. ISO string)
    const parsedDate = new Date(ms);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }
    
    return null;
  }
}
