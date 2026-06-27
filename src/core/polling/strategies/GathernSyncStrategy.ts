import { PoolConnection } from 'mysql2/promise';
import { ISyncStrategy, IThreadMetadata } from '../../interfaces/ISyncEngine';
import { ThreadMetadataRepository } from '../../db/repositories/ThreadMetadataRepository';
import { MessageRepository } from '../../db/repositories/MessageRepository';

export class GathernSyncStrategy implements ISyncStrategy {
  readonly platform = 'gathern';

  constructor(
    private threadParser: any,
    private paginator: any,
    private threadRepo: ThreadMetadataRepository,
    private messageRepo: MessageRepository
  ) {}

  async initialSync(account: any, connection: PoolConnection): Promise<void> {
    console.log(`\x1b[35m[Sync] 🚀 Initial Sync started for Gathern Account: ${account.account_name}\x1b[0m`);
    let page = 1;
    let totalSyncedThreads = 0;

    // Synchronize up to 10 pages for Gathern initial sync
    while (page <= 10) {
      const result = await this.fetchChatsPage(account, page);
      if (!result || result.chats.length === 0) break;

      console.log(`[Sync] Initial Sync Gathern page ${page}: Found ${result.chats.length} chats`);

      for (const rawChat of result.chats) {
        const parsed = this.threadParser.parse(rawChat, {
          platform: 'gathern',
          accountId: account.id,
          hostUserId: account.platform_user_id
        });
        if (!parsed || !parsed.threadId) continue;

        const metaId = `${account.id}-gathern-${parsed.threadId}`;
        const meta: IThreadMetadata = {
          id: metaId,
          browserAccountId: account.id,
          platform: 'gathern',
          threadId: parsed.threadId,
          guestName: parsed.guestName || 'Guest',
          unitId: parsed.listingId || undefined,
          reservationId: parsed.reservationId || undefined,
          syncStatus: 'pending_initial_sync',
          metadataJson: JSON.stringify(rawChat)
        };

        await this.threadRepo.upsert(meta);

        try {
          const unitId = String(rawChat.unit_id || rawChat.chalet_id || '');
          const messages = await this.fetchChatMessages(account, parsed.threadId, unitId);
          
          for (const msg of messages) {
            await this.messageRepo.saveMessage({
              accountId: account.id,
              platformAccountId: account.platform_user_id || null,
              platform: 'gathern',
              threadId: parsed.threadId,
              msgId: msg.id,
              guestName: parsed.guestName,
              text: msg.text,
              isFromMe: msg.isFromHost ? 1 : 0,
              sentAt: msg.timestamp,
              rawData: JSON.stringify(msg.rawData)
            });
          }

          // Complete metadata sync status
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
          console.error(`[Sync]   ❌ Initial Sync failed for Gathern thread ${parsed.threadId}: ${e.message}`);
          await this.threadRepo.updateSyncStatus(metaId, 'failed', e.message);
        }
      }

      if (result.pageInfo.hasNextPage) {
        page++;
      } else {
        break;
      }
    }

    console.log(`\x1b[32m[Sync] ✅ Initial Sync complete for Gathern Account ${account.account_name}: ${totalSyncedThreads} threads synchronized\x1b[0m`);
  }

  async incrementalSync(account: any, connection: PoolConnection): Promise<void> {
    console.log(`[Sync] 🔄 Incremental Sync started for Gathern Account: ${account.account_name}`);
    
    const MAX_INCREMENTAL_PAGES = 3;
    let currentPage = 1;
    let checkedCount = 0;
    let updatedCount = 0;

    while (currentPage <= MAX_INCREMENTAL_PAGES) {
      const res = await this.fetchChatsPage(account, currentPage);
      if (!res || !res.chats || res.chats.length === 0) {
        console.log(`[Sync] Gathern chats page ${currentPage} empty for ${account.account_name}`);
        break;
      }

      console.log(`\n\x1b[35m=== DEBUG STAGE 1 (API Response - Gathern) ===\x1b[0m`);
      console.log(`[DEBUG 1] Fetched Inbox Page ${currentPage}. Total Threads in Response: ${res.chats.length}`);

      let newOnPage = 0;
      let checkedOnPage = 0;

      for (const rawChat of res.chats) {
        const parsed = this.threadParser.parse(rawChat, {
          platform: 'gathern',
          accountId: account.id,
          hostUserId: account.platform_user_id
        });
        if (!parsed || !parsed.threadId) continue;

        checkedOnPage++;
        checkedCount++;
        const localMeta = await this.threadRepo.findByThreadId(account.id, 'gathern', parsed.threadId);
        
        const serverLastMsgId = this.extractServerLastMessageId(rawChat);
        const serverLastMsgTimestamp = this.extractServerLastMessageTimestamp(rawChat);

        const needsSync = !localMeta ||
                          localMeta.syncStatus !== 'synced' ||
                          (serverLastMsgId
                            ? localMeta.lastMessageId !== serverLastMsgId
                            : (serverLastMsgTimestamp && localMeta.lastMessageTimestamp?.getTime() !== serverLastMsgTimestamp.getTime()));

        if (!localMeta) newOnPage++;

        if (!needsSync) {
          // Unchanged: touch sync status time and skip details
          const meta = this.mapToMetadata(parsed, account.id, rawChat);
          meta.syncStatus = 'synced';
          meta.lastSyncedAt = new Date();
          meta.lastMessageId = localMeta.lastMessageId;
          meta.lastMessageTimestamp = localMeta.lastMessageTimestamp;
          meta.messageCount = localMeta.messageCount;
          await this.threadRepo.upsert(meta);
          continue;
        }

        console.log(`\n\x1b[35m=== DEBUG STAGE 1 & 2 (Gathern) ===\x1b[0m`);
        console.log(`[DEBUG 1] Received response for thread: ${parsed.threadId}. Server Last Msg ID: ${serverLastMsgId}, Timestamp: ${serverLastMsgTimestamp}`);

        try {
          // 1) Ensure thread exists in DB immediately before fetching messages
          // This solves the disappearing-thread problem where the UI inbox query
          // requires the thread metadata row to exist.
          const initialMeta = this.mapToMetadata(parsed, account.id, rawChat);
          initialMeta.syncStatus = 'syncing';
          if (localMeta) {
             initialMeta.lastMessageId = localMeta.lastMessageId;
             initialMeta.lastMessageTimestamp = localMeta.lastMessageTimestamp;
             initialMeta.messageCount = localMeta.messageCount;
          }
          await this.threadRepo.upsert(initialMeta);

          const unitId = String(rawChat.unit_id || rawChat.chalet_id || '');
          const messages = await this.fetchChatMessages(account, parsed.threadId, unitId);
          
          console.log(`[DEBUG 2] After Parser. Parsed messages count: ${messages.length}`);
          if (messages.length > 0) {
            console.log(`[DEBUG 2] First Message: ID=${messages[0].id}, Text=${messages[0].text.substring(0, 20)}, SentAt=${messages[0].timestamp}`);
            const lastMsg = messages[messages.length - 1];
            console.log(`[DEBUG 2] Last Message: ID=${lastMsg.id}, Text=${lastMsg.text.substring(0, 20)}, SentAt=${lastMsg.timestamp}`);
          }

          for (const msg of messages) {
            await this.messageRepo.saveMessage({
              accountId: account.id,
              platformAccountId: account.platform_user_id || null,
              platform: 'gathern',
              threadId: parsed.threadId,
              msgId: msg.id,
              guestName: parsed.guestName,
              text: msg.text,
              isFromMe: msg.isFromHost ? 1 : 0,
              sentAt: msg.timestamp,
              rawData: JSON.stringify(msg.rawData)
            });
          }

          const meta = this.mapToMetadata(parsed, account.id, rawChat);
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
          console.log(`[Sync]   ✅ Updated Gathern thread ${parsed.threadId}`);
        } catch (err: any) {
          console.error(`[Sync]   ❌ Gathern thread ${parsed.threadId} detail sync failed: ${err.message}`);
          const metaId = `${account.id}-gathern-${parsed.threadId}`;
          await this.threadRepo.updateSyncStatus(metaId, 'failed', err.message);
        }
      }

      // "New thread continuation" rule: if ALL threads on this page were new,
      // there may be more new threads on the next page — keep going.
      const allNew = checkedOnPage > 0 && newOnPage === checkedOnPage;
      if (allNew && res.pageInfo.hasNextPage && currentPage < MAX_INCREMENTAL_PAGES) {
        console.log(`[Sync] Page ${currentPage} was entirely new threads (${newOnPage}/${checkedOnPage}). Fetching page ${currentPage + 1}...`);
        currentPage++;
      } else {
        // Found at least one known thread — no need to go deeper
        break;
      }
    }

    console.log(`\x1b[32m[Sync] ✅ Incremental Sync complete for Gathern: checked ${checkedCount} threads, updated ${updatedCount}\x1b[0m`);
  }

  async syncSingleThread(account: any, threadId: string, connection: PoolConnection): Promise<void> {
    console.log(`[Sync] 🎯 Targeted Sync for Gathern thread: ${threadId}`);
    try {
      const localMeta = await this.threadRepo.findByThreadId(account.id, 'gathern', threadId);
      const unitId = localMeta?.unitId || '';
      
      const messages = await this.fetchChatMessages(account, threadId, unitId);
      
      for (const msg of messages) {
        await this.messageRepo.saveMessage({
          accountId: account.id,
          platformAccountId: account.platform_user_id || null,
          platform: 'gathern',
          threadId: threadId,
          msgId: msg.id,
          guestName: msg.guestName || localMeta?.guestName || 'Guest',
          text: msg.text,
          isFromMe: msg.isFromHost ? 1 : 0,
          sentAt: msg.timestamp,
          rawData: JSON.stringify(msg.rawData)
        });
      }
      
      if (localMeta && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        localMeta.lastMessageId = lastMsg.id;
        localMeta.lastMessageTimestamp = lastMsg.timestamp;
        localMeta.messageCount = messages.length;
        localMeta.lastSyncedAt = new Date();
        localMeta.syncStatus = 'synced';
        await this.threadRepo.upsert(localMeta);
      }
      
      console.log(`[Sync]   ✅ Targeted sync for Gathern thread ${threadId} complete (${messages.length} messages).`);
    } catch (e: any) {
      console.error(`[Sync]   ❌ Targeted sync for Gathern thread ${threadId} failed: ${e.message}`);
    }
  }


  // ── Helper fetch methods ────────────────────────────────────────────────
  private async fetchChatsPage(account: any, page: number): Promise<{ chats: any[], pageInfo: any } | null> {
    const res = await fetch('https://chatapi-prod.gathern.co/api/v2/user_chat/chats', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.chat_auth_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ chat_type: '2', page: String(page) }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Gathern chats page ${page} fetch failed: HTTP ${res.status}: ${body.substring(0, 200)}`);
    }

    const json = await res.json() as any;
    let chats: any[] = [];
    if (Array.isArray(json.contact_list)) chats = json.contact_list;
    else if (Array.isArray(json.data?.data)) chats = json.data.data;
    else if (Array.isArray(json.data)) chats = json.data;
    else if (json.data && typeof json.data === 'object') {
      chats = Object.values(json.data).filter(Array.isArray).flat();
    }

    const pageInfo = this.paginator.detect(json);
    return { chats, pageInfo };
  }

  private async fetchChatMessages(account: any, chatUid: string, unitId: string): Promise<any[]> {
    const res = await fetch('https://chatapi-prod.gathern.co/api/v2/user_chat/chat_details', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${account.chat_auth_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({ is_support: '0', unit_id: unitId, chat_type: '2', chat_uid: chatUid, page: '1' }),
    });

    if (!res.ok) {
      throw new Error(`fetchChatMessages failed for ${chatUid}: HTTP ${res.status}`);
    }

    const json = await res.json();
    const ctx = { platform: 'gathern', accountId: account.id, hostUserId: account.platform_user_id };
    return this.threadParser.extractAllMessages(json, ctx);
  }

  private mapToMetadata(parsed: any, accountId: string, rawChat: any): IThreadMetadata {
    return {
      id: `${accountId}-gathern-${parsed.threadId}`,
      browserAccountId: accountId,
      platform: 'gathern',
      threadId: parsed.threadId,
      guestName: parsed.guestName || 'Guest',
      unitId: parsed.listingId || undefined,
      reservationId: parsed.reservationId || undefined,
      syncStatus: 'synced',
      metadataJson: JSON.stringify(rawChat)
    };
  }

  private extractServerLastMessageId(rawChat: any): string | null {
    const lm = rawChat.last_message;
    if (!lm) return null;
    const id = lm.id ?? lm.message_id;
    return id ? String(id) : null;
  }

  private extractServerLastMessageTimestamp(rawChat: any): Date | null {
    const lm = rawChat.last_message;
    if (!lm || !lm.created_at) return null;
    
    // Check if it's a numeric unix timestamp
    if (!isNaN(Number(lm.created_at))) {
        const val = Number(lm.created_at);
        return new Date(val > 1e12 ? val : val * 1000);
    }
    
    // Check if it's a date string (e.g. "2026-06-27 10:00:00")
    const parsedDate = new Date(lm.created_at);
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
    }
    
    return null;
  }
}
