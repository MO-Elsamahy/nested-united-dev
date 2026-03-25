import { BrowserWindow } from 'electron';
import { BrowserAccountSession, fetchAirbnbMessages, fetchAirbnbReservations, fetchGathernMessages, fetchGathernReservations, checkSessionHealth } from './platform-api';
import { browserSessions } from './platform-api';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

// Helper to safely parse platform dates for MySQL
function parsePlatformDate(dateStr?: any): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  
  const lower = dateStr.toLowerCase();
  // Handle relative Airbnb dates like "2 hours ago", "Yesterday"
  if (lower.includes('ago') || lower.includes('yesterday')) {
      return new Date(); // Close enough for background sync
  }
  
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

// Helper to get DB connection (reusing project's env)
async function getDbConnection() {
  const envPath = path.join(__dirname, '../.env');
  const env: any = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        env[key] = val;
      }
    });
  }

  return mysql.createConnection({
    host: env['DB_HOST'] || 'localhost',
    port: parseInt(env['DB_PORT'] || '3306'),
    user: env['DB_USER'] || 'root',
    password: env['DB_PASSWORD'] || '',
    database: env['DB_NAME'] || 'rentals_dashboard',
  });
}

export class PollingService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private mainWindow: BrowserWindow | null;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    console.log('[Polling Service] 🛰️ Initialized with MainWindow');
  }

  /**
   * Starts polling for all accounts found in the database
   */
  public async startPollingFromDB() {
    console.log('[Polling Service] 📦 Loading active accounts from DB for polling...');
    const connection = await getDbConnection();
    try {
      const [rows]: any = await connection.execute(
        "SELECT id, platform, account_name as accountName, session_partition as `partition` FROM browser_accounts WHERE is_active = 1"
      );
      
      for (const row of rows) {
        if (row.platform !== 'whatsapp') {
          // Add to browserSessions if not already there (stubs for background polling)
          if (!browserSessions.has(row.id)) {
            browserSessions.set(row.id, {
              id: row.id,
              platform: row.platform,
              accountName: row.accountName,
              partition: row.partition,
              createdBy: 'system',
            });
          }
          this.startPolling(browserSessions.get(row.id)!);
        }
      }
    } catch (err) {
      console.error('[Polling Service] ❌ Failed to start polling from DB:', err);
    } finally {
      await connection.end();
    }
  }

  /**
   * Starts polling for a specific account
   */
  public startPolling(account: BrowserAccountSession) {
    if (this.intervals.has(account.id)) return;

    console.log(`[Polling Service] 🚀 Starting interval polling for ${account.accountName} (${account.platform})`);

    // Poll every 1 min for background sync (10s might be too aggressive for background, but keeping for now per plan)
    const interval = setInterval(() => this.poll(account), 30000);
    this.intervals.set(account.id, interval);
    
    // Trigger immediate poll
    this.poll(account);
  }

  public stopPolling(accountId: string) {
    const interval = this.intervals.get(accountId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(accountId);
      console.log(`[Polling Service] 🛑 Stopped polling for account ${accountId}`);
    }
  }

  /**
   * Manual or triggered sync for a single account
   */
  public async syncAccount(account: any) {
    console.log(`[Polling Service][${account.accountName}] 🔄 Manual sync triggered...`);
    await this.poll(account);
  }

  private async poll(initialAccount: BrowserAccountSession) {
    try {
      // Always get the LATEST account data from the central store to get captured tokens/keys
      const account = browserSessions.get(initialAccount.id) || initialAccount;
      
      console.log(`[Polling Service][${account.accountName}] 🔍 Starting poll cycle...`);
      
      // 1. Check health
      const isHealthy = await checkSessionHealth(account);
      console.log(`[Polling Service][${account.accountName}] 💓 Health check: ${isHealthy ? 'HEALTHY' : 'EXPIRED'}`);
      await this.logHealth(account, isHealthy ? 'healthy' : 'expired');

      if (!isHealthy) {
        console.warn(`[Polling Service][${account.accountName}] ⚠️ Skipping sync due to unhealthy session.`);
        return;
      }

      // 2. Poll Messages
      console.log(`[Polling Service][${account.accountName}] 📥 Syncing messages...`);
      await this.syncMessages(account);

      console.log(`[Polling Service][${account.accountName}] ✅ Poll cycle finished successfully.`);
    } catch (error: any) {
      console.error(`[Polling Service][${initialAccount.accountName}] ❌ Poll cycle FAILED:`, error.message);
      await this.logHealth(initialAccount, 'error', error.message);
    }
  }

  private async syncMessages(account: BrowserAccountSession) {
    let data;
    try {
      if (account.platform === 'airbnb') {
        data = await fetchAirbnbMessages(account);
      } else if (account.platform === 'gathern') {
        data = await fetchGathernMessages(account);
      }
    } catch (err: any) {
      console.error(`[Polling Service][${account.accountName}] ❌ Failed to fetch messages from platform:`, err.message);
      return;
    }

    if (!data) {
      console.log(`[Polling Service][${account.accountName}] ℹ️ No data received from platform.`);
      return;
    }

    if (data.threads) {
      console.log(`[Polling Service][${account.accountName}] 📋 Found ${data.threads.length} threads.`);
      for (const thread of data.threads) {
        const guestName = thread.other_user?.first_name || (account.platform === 'airbnb' ? 'Airbnb Guest' : 'Gathern Guest');
        const lastMsg = thread.last_message;
        if (lastMsg) {
          await this.savePlatformMessage(account.id, account.platform, thread.id, guestName, lastMsg.message, lastMsg.created_at, thread);
        }
      }
    }
  }

  /**
   * Specific methods expected by main.ts for real-time sync from webview
   */
  public async saveGathernMessages(accountId: string, chats: any[]) {
      const account = browserSessions.get(accountId);
      if (!account) return;
      
      for (const chat of chats) {
          const threadId = chat.id;
          const guestName = chat.guest?.name || 'Gathern Guest';
          const lastMsgText = chat.last_message?.body || '';
          const sentAt = chat.last_message?.created_at;
          await this.savePlatformMessage(accountId, 'gathern', threadId, guestName, lastMsgText, sentAt, chat);
      }
  }

  public async saveAirbnbSummaryMessage(accountId: string, threadId: string, guestName: string, summaryMsg: any) {
      const messageText = summaryMsg.message || summaryMsg.text || '';
      const sentAt = summaryMsg.created_at || summaryMsg.createdAt;
      await this.savePlatformMessage(accountId, 'airbnb', threadId, guestName, messageText, sentAt, summaryMsg);
  }

  private async savePlatformMessage(accountId: string, platform: string, threadId: string, guestName: string, text: string, sentAt: string, raw: any) {
    const connection = await getDbConnection();
    try {
      const [result]: any = await connection.execute(
        `INSERT INTO platform_messages 
        (id, platform_account_id, platform, thread_id, guest_name, message_text, sent_at, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        message_text = VALUES(message_text),
        sent_at = VALUES(sent_at),
        raw_data = VALUES(raw_data)`,
        [
          uuidv4(),
          accountId,
          platform,
          threadId,
          guestName,
          text,
          parsePlatformDate(sentAt), // Safe date parsing
          JSON.stringify(raw)
        ]
      );
      
      if (result.affectedRows === 1) {
          console.log(`[Polling Service][${platform}] 🆕 NEW MESSAGE saved for thread ${threadId}`);
          // New message! Send notification to renderer
          this.mainWindow?.webContents.send('new-platform-message', { accountId, platform, threadId, guestName, text });
      } else {
          console.log(`[Polling Service][${platform}] 🔄 Message updated/exists for thread ${threadId}`);
      }
    } catch (err) {
      console.error('[Polling Service] ❌ Failed to save message:', err);
    } finally {
      await connection.end();
    }
  }

  private async logHealth(account: BrowserAccountSession, status: 'healthy' | 'expired' | 'error', errorMsg?: string) {
    const connection = await getDbConnection();
    try {
      await connection.execute(
        `INSERT INTO session_health_logs (id, browser_account_id, platform, status, error_message)
        VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), account.id, account.platform, status, errorMsg || null]
      );
    } catch (err) {
      // Silently fail health logging to avoid spam
    } finally {
      await connection.end();
    }
  }
}
