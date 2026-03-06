import { BrowserWindow } from 'electron';
import { fetchAirbnbInboxList, fetchAirbnbMessages, PlatformAccount } from './platform-api';
import mysql from 'mysql2/promise';
import crypto from 'crypto';

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
};

export class PollingService {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private mainWindow: BrowserWindow | null = null;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        console.log('[PollingService] Initialized.');
    }

    async startPolling(account: PlatformAccount) {
        if (this.intervals.has(account.id)) return;
        console.log(`[PollingService] Starting poll for ${account.platform} account: ${account.id}`);
        this.syncAccount(account);
        const interval = setInterval(() => this.syncAccount(account), 5 * 60 * 1000);
        this.intervals.set(account.id, interval);
    }

    stopPolling(accountId: string) {
        const interval = this.intervals.get(accountId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(accountId);
        }
    }

    private async syncAccount(account: PlatformAccount) {
        try {
            console.log(`[PollingService] 🚀 Starting Full Deep Sync for ${account.id}...`);

            if (account.platform === 'airbnb') {
                // 1. Get the list of all 21+ threads
                const inboxData = await fetchAirbnbInboxList(account);
                const threadEdges = inboxData?.data?.node?.messagingInbox?.threads?.edges || [];
                
                console.log(`[PollingService] Found ${threadEdges.length} threads to process.`);

                // 2. Loop through each thread and get full message history
                for (const edge of threadEdges) {
                    const threadId = edge.node.id;
                    const guestName = edge.node.inboxTitle.accessibilityText;
                    
                    console.log(`[PollingService] Deep scanning guest: ${guestName}...`);
                    
                    // Fetch the full 50-message history for this specific guest
                    const fullThreadData = await fetchAirbnbMessages(account, threadId);
                    
                    // 3. Save to MySQL
                    await this.saveAirbnbMessages(account.id, fullThreadData);
                }
            }

            await this.updateLastSync(account.id);

            if (this.mainWindow) {
                this.mainWindow.webContents.send('sync-complete', { 
                    accountId: account.id, 
                    platform: account.platform 
                });
            }

        } catch (error: any) {
            console.error(`[PollingService] Sync failed for ${account.id}:`, error);
            await this.logHealth(account.id, account.platform, 'error', error.message);
        }
    }

    private async saveAirbnbMessages(accountId: string, data: any) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            // Path identified from your full-payload.json
            const thread = data?.data?.threadData;
            const messages = thread?.messageData?.messages || [];
            const threadId = thread?.id;
            const guestName = thread?.inboxTitle?.accessibilityText || 'Unknown Guest';

            for (const msg of messages) {
                const messageId = msg.id;
                // Capture Arabic text from multiple possible fields
                const text = msg.contentPreview?.content 
                          || msg.hydratedContent?.content?.body 
                          || "System Update";
                
                const sentAt = new Date(parseInt(msg.createdAtMs));

                await connection.execute(
                    `INSERT INTO platform_messages 
                    (id, platform_account_id, platform, thread_id, guest_name, message_text, sent_at, raw_data) 
                    VALUES (?, ?, 'airbnb', ?, ?, ?, ?, ?) 
                    ON DUPLICATE KEY UPDATE message_text = VALUES(message_text), sent_at = VALUES(sent_at)`,
                    [
                        crypto.randomUUID(),
                        accountId,
                        threadId,
                        guestName,
                        text,
                        sentAt,
                        JSON.stringify(msg)
                    ]
                );
            }
        } finally {
            await connection.end();
        }
    }

    private async updateLastSync(accountId: string) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute('UPDATE browser_accounts SET last_sync_at = NOW() WHERE id = ?', [accountId]);
        } finally {
            await connection.end();
        }
    }

    private async logHealth(accountId: string, platform: string, status: string, error?: string) {
        const connection = await mysql.createConnection(dbConfig);
        try {
            await connection.execute(
                'INSERT INTO session_health_logs (id, browser_account_id, platform, status, error_message) VALUES (?, ?, ?, ?, ?)',
                [crypto.randomUUID(), accountId, platform, status, error || null]
            );
        } finally {
            await connection.end();
        }
    }
}