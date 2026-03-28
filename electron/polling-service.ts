import { BrowserWindow } from 'electron';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import {
  BrowserAccountSession,
  browserSessions,
  fetchAirbnbMessages,
  fetchGathernMessages,
  checkSessionHealth,
} from './platform-api';

// ─────────────────────────────────────────────
// Shared DB Pool
// ─────────────────────────────────────────────

function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, '../../.env');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return env;
}

let dbPool: mysql.Pool | null = null;
function getPool(): mysql.Pool {
  if (dbPool) return dbPool;
  const env = loadEnv();
  dbPool = mysql.createPool({
    host: env['DB_HOST'] || '127.0.0.1',
    port: parseInt(env['DB_PORT'] || '3306'),
    user: env['DB_USER'] || 'root',
    password: env['DB_PASSWORD'] || '',
    database: env['DB_NAME'] || 'rentals_dashboard',
    connectionLimit: 5,
    connectTimeout: 10000,
  });
  return dbPool;
}

function safeDate(val?: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'number') return new Date(val * (val > 1e10 ? 1 : 1000));
  return new Date();
}

// ─────────────────────────────────────────────
// Polling Service
// ─────────────────────────────────────────────

export class PollingService {
  private intervals = new Map<string, NodeJS.Timeout>();
  private mainWindow: BrowserWindow | null;
  private readonly POLL_INTERVAL_MS = 10_000;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    console.log('[Polling] 🛰️ Service initialized (10s interval)');
  }

  public async startPollingFromDB() {
    try {
      const pool = getPool();
      const [rows]: any = await pool.execute(
        `SELECT id, platform, account_name AS accountName, session_partition AS \`partition\`,
                auth_token AS authToken, chat_auth_token AS chatAuthToken, platform_user_id AS platformUserId
         FROM browser_accounts WHERE is_active = 1 AND platform != 'whatsapp'`
      );

      for (const row of rows) {
        const existing = browserSessions.get(row.id);
        browserSessions.set(row.id, {
          id: row.id,
          platform: row.platform,
          accountName: row.accountName,
          partition: row.partition,
          createdBy: 'system',
          authToken: row.authToken || existing?.authToken,
          chatAuthToken: row.chatAuthToken || existing?.chatAuthToken,
          platformUserId: row.platformUserId || existing?.platformUserId,
        });
        this.startPolling(row.id);
      }
    } catch (err: any) {
      console.error('[Polling] ❌ startPollingFromDB error:', err.message);
    }
  }

  public startPolling(accountId: string) {
    if (this.intervals.has(accountId)) return;
    const account = browserSessions.get(accountId);
    if (!account) return;

    this.doPoll(accountId);
    const interval = setInterval(() => this.doPoll(accountId), this.POLL_INTERVAL_MS);
    this.intervals.set(accountId, interval);
  }

  public stopPolling(accountId: string) {
    const t = this.intervals.get(accountId);
    if (t) {
      clearInterval(t);
      this.intervals.delete(accountId);
    }
  }

  public async syncAccount(accountId: string) {
    await this.doPoll(accountId);
  }

  private async doPoll(accountId: string) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    try {
      const healthy = await checkSessionHealth(account);
      if (!healthy) return;

      let result: { threads: any[] } | null = null;
      if (account.platform === 'airbnb') result = await fetchAirbnbMessages(account);
      else if (account.platform === 'gathern') result = await fetchGathernMessages(account);

      if (!result || !result.threads.length) return;

      let newCount = 0;
      for (const t of result.threads) {
        const isNew = await this.saveMessage({
          accountId,
          platform: account.platform,
          threadId: t.id,
          platformMsgId: t.platform_msg_id,
          isFromMe: t.is_from_me ? 1 : 0,
          guestName: t.guest_name,
          messageText: t.last_message,
          sentAt: t.sent_at,
          raw: t.raw,
        });
        if (isNew) newCount++;
      }

      if (newCount > 0) {
        this.mainWindow?.webContents.send('platform-messages-updated', { accountId, newCount });
      }
    } catch (err: any) {
      console.error(`[Polling][${account.accountName}] ❌`, err.message);
    }
  }

  private async saveMessage(opts: {
    accountId: string; platform: string; threadId: string; platformMsgId: string;
    isFromMe: number; guestName: string; messageText: string; sentAt: any; raw: any;
  }): Promise<boolean> {
    if (!opts.threadId || !opts.platformMsgId) return false;

    try {
      const pool = getPool();
      const [result]: any = await pool.execute(
        `INSERT INTO platform_messages
           (id, platform_account_id, platform, thread_id, platform_msg_id, guest_name, message_text, is_from_me, sent_at, raw_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           guest_name   = VALUES(guest_name),
           message_text = VALUES(message_text),
           is_from_me   = VALUES(is_from_me),
           sent_at      = VALUES(sent_at),
           raw_data     = VALUES(raw_data)`,
        [uuidv4(), opts.accountId, opts.platform, opts.threadId, opts.platformMsgId, opts.guestName, opts.messageText, opts.isFromMe, safeDate(opts.sentAt), JSON.stringify(opts.raw)]
      );
      return result.affectedRows === 1;
    } catch (err: any) {
      console.error('[Polling] ❌ saveMessage error:', err.message);
      return false;
    }
  }

  // Legacy support for webview sync
  public async saveGathernMessages(accountId: string, chats: any[]) {
    for (const c of chats) {
      const msg = c.last_message || {};
      const senderId = String(msg.sender_id || '');
      const text = msg.message || msg.body || '';
      const time = msg.created_at || c.updated_at || '';
      const stableId = msg.id || msg.message_id || `stable-gathern-${c.chat_uid}-${senderId}-${time}-${text.substring(0, 15)}`;

      await this.saveMessage({
        accountId, platform: 'gathern', threadId: c.chat_uid || c.id,
        platformMsgId: String(stableId),
        isFromMe: 0, guestName: c.name || 'Guest', messageText: text,
        sentAt: msg.created_at, raw: c
      } as any);
    }
  }
}
