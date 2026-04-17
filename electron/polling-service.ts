import { BrowserWindow } from 'electron';
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import {
  SessionHealthResult,
  browserSessions,
  checkSessionHealth,
  setDbPool,
} from './platform-api';

// ─────────────────────────────────────────────
// DB Pool
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
    host:             env['DB_HOST']     || '127.0.0.1',
    port:             parseInt(env['DB_PORT'] || '3306'),
    user:             env['DB_USER']     || 'root',
    password:         env['DB_PASSWORD'] || '',
    database:         env['DB_NAME']     || 'rentals_dashboard',
    connectionLimit:  5,
    connectTimeout:   10_000,
  });
  // Share pool with platform-api so it can look up thread metadata
  setDbPool(dbPool);
  return dbPool;
}

// ─────────────────────────────────────────────
// Date utility
// ─────────────────────────────────────────────

function safeDate(val?: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'string') {
    if (/^\d+$/.test(val)) {
      const num = Number(val);
      if (!Number.isNaN(num)) return new Date(num > 1e10 ? num : num * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'number') return new Date(val > 1e10 ? val : val * 1000);
  return new Date();
}

// ─────────────────────────────────────────────
// Per-account last-known health state
// (used to detect transitions and write logs)
// ─────────────────────────────────────────────
const lastHealthState = new Map<string, boolean>();

// ─────────────────────────────────────────────
// One-shot debug-dumper
//   Writes the first captured payload for each (accountId, family) pair to
//   disk so we can inspect the real Airbnb / Gathern response shape without
//   needing to re-trigger the request. Files land in <cwd>/debug/airbnb-*.json
//   and overwrite on each dev-mode boot.
// ─────────────────────────────────────────────
const DUMP_DIR = path.join(process.cwd(), 'debug');
const dumped = new Set<string>();

function dumpOnce(key: string, label: string, payload: unknown) {
  if (dumped.has(key)) return;
  dumped.add(key);
  try {
    if (!fs.existsSync(DUMP_DIR)) fs.mkdirSync(DUMP_DIR, { recursive: true });
    const file = path.join(DUMP_DIR, `${label}.json`);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[Polling][dump] ${label} → ${file}`);
  } catch (err: any) {
    console.warn(`[Polling][dump] failed to write ${label}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────
// Airbnb response helpers
// (the current envelope uses GraphQL global ids + StandardText blocks)
// ─────────────────────────────────────────────

/** Decode an Airbnb global id like `TWVzc2FnZVRocmVhZDoyMDA5NDY1MzAx` → `2009465301`. */
function decodeAirbnbGlobalId(b64: string | null | undefined): string {
  if (!b64) return '';
  try {
    const decoded = Buffer.from(String(b64), 'base64').toString('utf8');
    // Looks like "MessageThread:2009465301" / "User:123" / etc.
    const colon = decoded.indexOf(':');
    return colon >= 0 ? decoded.slice(colon + 1) : decoded;
  } catch { return String(b64); }
}

/** Render an Airbnb StandardText block to plain text. */
function extractStandardText(st: any): string {
  if (!st) return '';
  if (typeof st === 'string') return st;
  if (Array.isArray(st.components)) {
    return st.components.map((c: any) => c?.text || '').join(' ').trim();
  }
  if (typeof st.accessibilityText === 'string') return st.accessibilityText;
  return '';
}

/** Extract human-readable text from Airbnb Message payload variants. */
function extractAirbnbMessageText(m: any): string {
  if (!m || typeof m !== 'object') return '';

  // Common direct fields.
  const direct =
    extractStandardText(m.text) ||
    extractStandardText(m.body) ||
    extractStandardText(m.content) ||
    (typeof m.text === 'string' ? m.text : '') ||
    (typeof m.body === 'string' ? m.body : '') ||
    (typeof m.message === 'string' ? m.message : '');
  if (direct) return direct;

  // Inbox preview shape.
  const preview =
    m.contentPreview?.content ||
    m.contentPreview?.translatedContent ||
    '';
  if (typeof preview === 'string' && preview.trim()) return preview.trim();

  // Thread rich shape.
  const hydrated = m.hydratedContent;
  if (hydrated) {
    if (typeof hydrated.plainText === 'string' && hydrated.plainText.trim()) {
      return hydrated.plainText.trim();
    }

    const content = hydrated.content;
    if (content) {
      if (typeof content.body === 'string' && content.body.trim()) {
        return content.body.trim();
      }
      if (Array.isArray(content.subMessages)) {
        const parts = content.subMessages
          .map((s: any) => (typeof s?.body === 'string' ? s.body.trim() : ''))
          .filter(Boolean);
        if (parts.length > 0) return parts.join(' | ');
      }
    }
  }

  return '';
}

/** Resolve host account id (the "me" side) for Airbnb threads. */
function resolveAirbnbHostAccountId(account: any, threadNode: any): string {
  const fromSessionRaw = String(account?.platformUserId || '');
  const fromSession = decodeAirbnbGlobalId(fromSessionRaw) || fromSessionRaw;
  if (/^\d+$/.test(fromSession)) return fromSession;

  const participantEdges: any[] =
    threadNode?.participants?.edges ||
    threadNode?.threadData?.participants?.edges ||
    [];

  for (const e of participantEdges) {
    const p = e?.node;
    if (!p) continue;
    const role = String(p.participantRole || p.productRole || '').toUpperCase();
    if (role.includes('HOST')) {
      const id = String(p.accountId || '');
      if (id) return id;
    }
  }

  // Last fallback: in many threads orderedParticipants puts guest first then host.
  const ordered = threadNode?.orderedParticipants;
  if (Array.isArray(ordered) && ordered.length > 1) {
    const maybeHost = String(ordered[1]?.accountId || '');
    if (maybeHost) return maybeHost;
  }
  return fromSession;
}

/** Pull the first additionalValues entry for a userThreadTag by name. */
function threadTagValue(node: any, tagName: string): string | null {
  const tags: any[] = Array.isArray(node?.userThreadTags) ? node.userThreadTags : [];
  for (const t of tags) {
    if (t?.userThreadTagName === tagName) {
      const vals = Array.isArray(t.additionalValues) ? t.additionalValues : [];
      if (vals.length > 0) return String(vals[0]);
    }
  }
  return null;
}

/** Dump nested object keys (one level deep per key) for diagnostics. */
function keyPathsPreview(obj: any, maxDepth = 3): string {
  const out: string[] = [];
  const walk = (node: any, prefix: string, depth: number) => {
    if (depth > maxDepth || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      out.push(`${prefix}[${node.length}]`);
      if (node[0] && typeof node[0] === 'object' && depth < maxDepth) {
        walk(node[0], prefix + '[0]', depth + 1);
      }
      return;
    }
    for (const k of Object.keys(node)) {
      const v = node[k];
      const nextPrefix = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) out.push(`${nextPrefix}[${v.length}]`);
        else                  out.push(`${nextPrefix}{${Object.keys(v).length}}`);
        walk(v, nextPrefix, depth + 1);
      }
    }
  };
  walk(obj, '', 0);
  return out.slice(0, 80).join(' ');
}

/** Walk `root` breadth-first; return the first array whose items match `predicate`. */
function findArrayOfShape(root: any, predicate: (o: any) => boolean): any[] {
  if (!root || typeof root !== 'object') return [];
  const queue: any[] = [root];
  const seen = new WeakSet<object>();
  let visited = 0;
  const MAX_NODES = 5000;
  while (queue.length && visited < MAX_NODES) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    visited++;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.slice(0, 3).every(predicate)) return node;
      for (const item of node) if (item && typeof item === 'object') queue.push(item);
    } else {
      for (const k of Object.keys(node)) {
        const v = (node as any)[k];
        if (v && typeof v === 'object') queue.push(v);
      }
    }
  }
  return [];
}

/** Heuristic: is this object a chat message? */
function looksLikeMessage(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const tn = obj.__typename || '';
  if (typeof tn === 'string' && /Message$/.test(tn)) return true;
  const hasId = 'id' in obj || 'messageId' in obj;
  if (!hasId) return false;
  return (
    'text'       in obj ||
    'body'       in obj ||
    'content'    in obj ||
    'createdAt'  in obj ||
    'createdAtMs' in obj ||
    'created_at' in obj ||
    'senderId'   in obj ||
    'sender'     in obj ||
    'account'    in obj ||
    'hydratedContent' in obj ||
    'contentPreview'  in obj
  );
}

// ─────────────────────────────────────────────
// Polling Service
// ─────────────────────────────────────────────

export class PollingService {
  private healthIntervals = new Map<string, NodeJS.Timeout>();
  private mainWindow: BrowserWindow | null;
  private readonly HEALTH_INTERVAL_MS = 30_000;

  constructor(mainWindow: BrowserWindow | null) {
    this.mainWindow = mainWindow;
    console.log('[Polling] 🛰️  Service initialized — reads come from CDP interceptor');
  }

  // ── Bootstrap: load all active accounts from DB ──────────────────────────

  public async startPollingFromDB() {
    try {
      const pool = getPool();
      const [rows]: any = await pool.execute(
        `SELECT id, platform, account_name AS accountName,
                session_partition   AS \`partition\`,
                auth_token          AS authToken,
                chat_auth_token     AS chatAuthToken,
                platform_user_id    AS platformUserId
         FROM browser_accounts
         WHERE is_active = 1 AND platform != 'whatsapp'`
      );

      for (const row of rows) {
        const existing = browserSessions.get(row.id);
        browserSessions.set(row.id, {
          id:             row.id,
          platform:       row.platform,
          accountName:    row.accountName,
          partition:      row.partition,
          createdBy:      'system',
          authToken:      row.authToken      || existing?.authToken,
          chatAuthToken:  row.chatAuthToken  || existing?.chatAuthToken,
          platformUserId: row.platformUserId || existing?.platformUserId,
          window:         existing?.window,
        });
        this.startHealthPolling(row.id);
      }

      console.log(`[Polling] ▶️  Health polling started for ${rows.length} account(s)`);
    } catch (err: any) {
      console.error('[Polling] ❌  startPollingFromDB error:', err.message);
    }
  }

  // ── Health polling (message reads flow through CDP, not a timer) ─────────

  public startHealthPolling(accountId: string) {
    if (this.healthIntervals.has(accountId)) return;
    const account = browserSessions.get(accountId);
    if (!account) return;

    this.checkHealth(accountId);
    const interval = setInterval(() => this.checkHealth(accountId), this.HEALTH_INTERVAL_MS);
    this.healthIntervals.set(accountId, interval);
  }

  public stopPolling(accountId: string) {
    const t = this.healthIntervals.get(accountId);
    if (t) {
      clearInterval(t);
      this.healthIntervals.delete(accountId);
    }
  }

  private emitNewMessages(accountId: string, platform: 'airbnb' | 'gathern', accountName: string, newCount: number) {
    if (!this.mainWindow || newCount <= 0) return;
    this.mainWindow.webContents.send('platform-messages-updated', { accountId, newCount });
    this.mainWindow.webContents.send('browser-notification', {
      accountId,
      accountName,
      platform,
      count: newCount,
    });
  }

  /** Kept for the force-platform-sync IPC — runs a single health check. */
  public async syncAccount(accountId: string) {
    await this.checkHealth(accountId);
  }

  private async checkHealth(accountId: string) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    try {
      const health = await checkSessionHealth(account);
      await this.writeHealthLog(accountId, account.platform, health);

      if (!health.healthy) {
        if (lastHealthState.get(accountId) !== false) {
          console.warn(`[Polling][${account.accountName}] ⚠️  Unhealthy session: ${health.reason}`);
          lastHealthState.set(accountId, false);
          this.mainWindow?.webContents.send('session-health-changed', {
            accountId,
            healthy: false,
            reason: health.reason,
          });
        }
        return;
      }

      if (lastHealthState.get(accountId) === false) {
        console.log(`[Polling][${account.accountName}] ✅  Session healthy again`);
        this.mainWindow?.webContents.send('session-health-changed', {
          accountId,
          healthy: true,
          reason: 'ok',
        });
      }
      lastHealthState.set(accountId, true);
    } catch (err: any) {
      console.error(`[Polling][${account?.accountName}] ❌ health check`, err.message);
    }
  }

  // ── CDP snapshot entrypoint ──────────────────────────────────────────────
  // Single dispatcher called by cdp-interceptor.ts. Routes each captured
  // response to the matching processor. All heavy lifting lives in the
  // existing process* methods below.

  public async processSnapshot(accountId: string, url: string, json: unknown): Promise<void> {
    if (!url) return;

    if (url.indexOf('ViaductInboxData') !== -1) {
      return this.processAirbnbInboxSnapshot(accountId, json);
    }
    if (url.indexOf('ViaductGetThreadAndDataQuery') !== -1) {
      // Extract threadId from the URL variables (base64 of "MessageThread:<id>").
      const match = url.match(/globalThreadId%22%3A%22([^%]+)%22/);
      let threadId: string | null = null;
      if (match) {
        try {
          const decoded = Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8');
          threadId = decoded.replace('MessageThread:', '');
        } catch { threadId = null; }
      }
      return this.processAirbnbThreadSnapshot(accountId, json, threadId);
    }
    if (
      url.indexOf('SyncProtocolSubscription') !== -1 ||
      url.indexOf('CreateBulkMessagesMutation') !== -1 ||
      url.indexOf('CreateInstantEventViaductMutation') !== -1
    ) {
      return this.processAirbnbRealtimeSnapshot(accountId, json, url);
    }
    if (
      url.indexOf('chatapi-prod.gathern.co') !== -1 ||
      url.indexOf('/api/v2/user_chat/')       !== -1
    ) {
      return this.processGathernChatSnapshot(accountId, json, url);
    }
  }

  // ── Save single message to DB ─────────────────────────────────────────────

  private async saveMessage(opts: {
    accountId:    string;
    platform:     string;
    threadId:     string;
    platformMsgId: string;
    isFromMe:     number;
    guestName:    string;
    messageText:  string;
    sentAt:       any;
    raw:          any;
  }): Promise<boolean> {
    if (!opts.threadId || !opts.platformMsgId) return false;

    try {
      const pool = getPool();

      // Lookup the real platform_account_id from browser_accounts
      let platformAccountId: string | null = null;
      try {
        const [paRows]: any = await pool.execute(
          `SELECT platform_account_id FROM browser_accounts WHERE id = ? LIMIT 1`,
          [opts.accountId]
        );
        platformAccountId = paRows?.[0]?.platform_account_id || null;
      } catch { /* not critical */ }

      const [result]: any = await pool.execute(
        `INSERT INTO platform_messages
           (id, browser_account_id, platform_account_id, platform, thread_id,
            platform_msg_id, guest_name, message_text, is_from_me, sent_at, raw_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           guest_name    = COALESCE(NULLIF(VALUES(guest_name), ''), guest_name),
           message_text  = VALUES(message_text),
           is_from_me    = VALUES(is_from_me),
           sent_at       = VALUES(sent_at),
           raw_data      = VALUES(raw_data)`,
        [
          uuidv4(),
          opts.accountId,
          platformAccountId,
          opts.platform,
          opts.threadId,
          opts.platformMsgId,
          opts.guestName,
          opts.messageText,
          opts.isFromMe,
          safeDate(opts.sentAt),
          JSON.stringify(opts.raw),
        ]
      );

      return result.affectedRows === 1;
    } catch (err: any) {
      console.error('[Polling] ❌  saveMessage error:', err.message);
      return false;
    }
  }

  // ── Upsert thread metadata ─────────────────────────────────────────────────

  private async upsertThreadMeta(
    browserAccountId: string,
    threadId:         string,
    platform:         string,
    meta: {
      unit_id:        string | null;
      chalet_id:      string | null;
      reservation_id: string | null;
      guest_name:     string | null;
    }
  ) {
    if (!meta.unit_id && !meta.chalet_id) return; // nothing useful
    try {
      const pool = getPool();
      await pool.execute(
        `INSERT INTO platform_thread_metadata
           (id, browser_account_id, thread_id, platform, unit_id, chalet_id, reservation_id, guest_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           unit_id        = COALESCE(VALUES(unit_id),        unit_id),
           chalet_id      = COALESCE(VALUES(chalet_id),      chalet_id),
           reservation_id = COALESCE(VALUES(reservation_id), reservation_id),
           guest_name     = COALESCE(NULLIF(VALUES(guest_name), ''), guest_name)`,
        [
          uuidv4(),
          browserAccountId,
          threadId,
          platform,
          meta.unit_id,
          meta.chalet_id,
          meta.reservation_id,
          meta.guest_name,
        ]
      );
    } catch { /* non-critical */ }
  }

  // ── Write session health log ───────────────────────────────────────────────

  private async writeHealthLog(
    browserAccountId: string,
    platform:         string,
    health:           SessionHealthResult
  ) {
    try {
      const pool = getPool();
      const status = health.healthy ? 'healthy' : (health.reason === 'exception' ? 'error' : 'expired');
      await pool.execute(
        `INSERT INTO session_health_logs
           (id, browser_account_id, platform, status, error_message, checked_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [
          uuidv4(),
          browserAccountId,
          platform,
          status,
          health.healthy ? null : health.reason,
        ]
      );
    } catch { /* non-critical */ }
  }

  // ── Process Airbnb realtime snapshots (subscription/mutations) ───────────
  // These events often carry new message nodes earlier than a full thread
  // refetch; consuming them reduces perceived inbox delay.
  private async processAirbnbRealtimeSnapshot(accountId: string, data: any, url: string) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    const hostAccountId = resolveAirbnbHostAccountId(account, data?.data?.threadData || data?.data || data);
    if (hostAccountId && account.platformUserId !== hostAccountId) {
      account.platformUserId = hostAccountId;
    }

    const msgs = findArrayOfShape(
      data,
      (m: any) => looksLikeMessage(m) && (!!m?.threadId || !!m?.account?.accountId || !!m?.senderId)
    );
    if (!Array.isArray(msgs) || msgs.length === 0) return;

    let newCount = 0;
    for (const m of msgs) {
      const threadId = String(
        m?.threadId ||
        m?.thread_id ||
        decodeAirbnbGlobalId(m?.thread?.id) ||
        ''
      );
      if (!threadId) continue;

      const senderId = String(
        m?.senderId ||
        m?.account?.accountId ||
        decodeAirbnbGlobalId(m?.sender?.id) ||
        m?.sender_id ||
        ''
      );
      const isFromMe = (
        m?.role === 'HOST'
        || (hostAccountId && senderId === hostAccountId)
        || (account.platformUserId && senderId === account.platformUserId)
      ) ? 1 : 0;

      const platformMsgId = String(
        decodeAirbnbGlobalId(m?.id) ||
        m?.messageId ||
        ''
      );
      if (!platformMsgId) continue;

      const saved = await this.saveMessage({
        accountId,
        platform:      'airbnb',
        threadId,
        platformMsgId,
        isFromMe,
        // Do not use host account name here (it pollutes thread titles).
        // Keep guest name only when we can infer a real non-host sender.
        guestName:     isFromMe ? '' : (
          m?.sender?.firstName ||
          m?.author?.firstName ||
          m?.guestName ||
          ''
        ),
        messageText:   extractAirbnbMessageText(m),
        sentAt:        m?.createdAtMs || m?.createdAt || m?.created_at || m?.updatedAtMs || new Date().toISOString(),
        raw:           m,
      });
      if (saved) newCount++;
    }

    if (newCount > 0) {
      console.log(`[CDP][${account.accountName}] ⚡ Airbnb realtime (${newCount}) from ${url.split('?')[0]}`);
      this.emitNewMessages(accountId, 'airbnb', account.accountName, newCount);
    }
  }

  // ── Process Airbnb inbox snapshot (captured via CDP) ──────────────────────
  // Current Airbnb envelope (as of Apr 2026):
  //   data.data.node.messagingInbox.inboxItems.edges[].node  → MessageThread
  //
  // Each MessageThread exposes:
  //   id                       global id like "TWVzc2FnZVRocmVhZDoyMDA5NDY1MzAx"
  //   inboxTitle               StandardText — guest name
  //   inboxDescription         StandardText — trip summary / listing
  //   inboxPreview / lastMessage — preview text (varies; we extract with BFS)
  //   userThreadTags           contains stay_listing_ids (listing id), trip_stages
  //   messageThreadType        e.g. "HOME_BOOKING"
  //
  // Legacy paths (data.presentation.inbox.threads…) are still checked as a
  // fallback so older Airbnb variants don't silently break.

  private async processAirbnbInboxSnapshot(accountId: string, data: any) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    const inboxItems =
      data?.data?.node?.messagingInbox?.inboxItems
      ?? data?.data?.viewer?.messagingInbox?.inboxItems
      ?? null;
    const edges: any[] = inboxItems?.edges ?? [];
    let threads: any[] = edges.map((e: any) => e?.node).filter(Boolean);

    // Legacy fallback — keep it for belt-and-braces.
    if (threads.length === 0 && !inboxItems) {
      const legacyInbox    = data?.data?.presentation?.inbox;
      const legacyThreads  = legacyInbox?.threads;
      threads =
        (Array.isArray(legacyThreads?.threads) && legacyThreads.threads) ||
        (Array.isArray(legacyThreads?.nodes)   && legacyThreads.nodes)   ||
        (Array.isArray(legacyThreads)          && legacyThreads)         ||
        (Array.isArray(data?.data?.presentation?.threads) && data.data.presentation.threads) ||
        [];
    }

    // Pagination / end-of-list responses legitimately return an empty edges
    // array. Only emit the diagnostic dump if we also failed to find the
    // expected envelope shape — otherwise it's just a quiet empty page.
    if (threads.length === 0 && inboxItems) {
      return;
    }

    if (threads.length === 0) {
      console.warn(`[CDP][${account.accountName}] ⚠️  Inbox snapshot had 0 threads. Diagnostic:`);
      console.warn(`  top-level keys:     ${Object.keys(data || {}).join(',')}`);
      console.warn(`  data.data keys:     ${Object.keys(data?.data || {}).join(',')}`);
      console.warn(`  nested structure:   ${keyPathsPreview(data?.data, 3).substring(0, 500)}`);
      if (data?.errors) {
        console.warn(`  errors:             ${JSON.stringify(data.errors).substring(0, 300)}`);
      }
      try {
        console.warn(`  sample:             ${JSON.stringify(data).substring(0, 1200)}`);
      } catch { /* non-serializable */ }
      return;
    }

    console.log(`[CDP][${account.accountName}] 📥  Airbnb inbox: ${threads.length} thread(s)`);

    // One-shot diagnostic: dump the very first thread we ever see for this
    // account so we can inspect the real field names without guessing.
    dumpOnce(
      `airbnb-inbox-thread-${accountId}`,
      `airbnb-inbox-thread-${account.accountName.replace(/[^a-z0-9]/gi, '_')}`,
      threads[0],
    );
    dumpOnce(
      `airbnb-inbox-full-${accountId}`,
      `airbnb-inbox-full-${account.accountName.replace(/[^a-z0-9]/gi, '_')}`,
      data,
    );

    let newCount = 0;

    for (const t of threads) {
      const threadId = decodeAirbnbGlobalId(t?.id) || String(t?.threadId || '');
      if (!threadId) continue;
      const hostAccountId = resolveAirbnbHostAccountId(account, t);
      if (hostAccountId && account.platformUserId !== hostAccountId) {
        account.platformUserId = hostAccountId;
      }

      // Guest name — new shape is inboxTitle (StandardText), old was `name` / `otherUser`.
      const guestName =
        extractStandardText(t.inboxTitle) ||
        t.name ||
        t.otherUser?.firstName ||
        'Guest';

      // Preview text — try message-carrying candidates; do NOT fall back to
      // inboxDescription because that holds the trip summary ("Mar 29 – 30 ·
      // The Lounge Nest"), not the last-message preview. An empty string
      // here lets real messages (from the thread detail query) win later.
      const lastMsgCandidate =
        t?.messages?.edges?.[0]?.node ||
        t.lastMessage                 ||
        t.messagePreview              ||
        t.inboxMessage                ||
        t.inboxPreview                ||
        t.previewMessage              ||
        null;
      const messageText = extractAirbnbMessageText(lastMsgCandidate);

      const sentAtRaw =
        lastMsgCandidate?.createdAt   ||
        lastMsgCandidate?.created_at  ||
        lastMsgCandidate?.createdAtMs ||
        t.lastMessageAt               ||
        t.updatedAt                   ||
        '';
      // If we couldn't find a real message timestamp in the inbox envelope,
      // use a very old placeholder so real messages from the thread detail
      // query always sort as "newer" and win the inbox-list preview.
      const sentAt = sentAtRaw || new Date('2000-01-01T00:00:00Z').toISOString();

      const senderId = String(
        lastMsgCandidate?.senderId ||
        lastMsgCandidate?.account?.accountId ||
        decodeAirbnbGlobalId(lastMsgCandidate?.sender?.id) ||
        lastMsgCandidate?.sender_id ||
        ''
      );
      const isFromMe = lastMsgCandidate?.role === 'HOST'
        || (hostAccountId && senderId === hostAccountId)
        || (account.platformUserId && senderId === account.platformUserId);

      const platformMsgId = String(
        decodeAirbnbGlobalId(lastMsgCandidate?.id) ||
        lastMsgCandidate?.messageId ||
        `inbox-stub-airbnb-${threadId}`
      );

      const isNew = await this.saveMessage({
        accountId,
        platform:      'airbnb',
        threadId,
        platformMsgId,
        isFromMe:      isFromMe ? 1 : 0,
        guestName,
        messageText,
        sentAt,
        raw:           t,
      });

      const listingId =
        threadTagValue(t, 'stay_listing_ids') ||
        t.listingId ||
        t.reservation?.listingId ||
        null;
      const reservationId =
        t.reservationId ||
        t.reservation?.id ||
        null;

      await this.upsertThreadMeta(accountId, threadId, 'airbnb', {
        unit_id:        listingId,
        chalet_id:      null,
        reservation_id: reservationId,
        guest_name:     guestName,
      });

      if (isNew) newCount++;
    }

    if (newCount > 0) {
      this.emitNewMessages(accountId, 'airbnb', account.accountName, newCount);
      console.log(`[CDP][${account.accountName}] 📨  ${newCount} new thread(s) saved`);
    }
  }

  // ── Process Airbnb thread detail snapshot (captured via CDP) ──────────────

  // ViaductGetThreadAndDataQuery — current envelope is:
  //   data.data.threadData  = the full MessageThread node
  // The messages array may live under various keys inside threadData
  // (inboxMessages / messages / messagesForMessageThreadConnection…),
  // so we try direct paths first then fall back to BFS shape-matching.
  private async processAirbnbThreadSnapshot(accountId: string, data: any, threadId: string | null) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    const threadData = data?.data?.threadData ?? data?.data ?? null;

    // One-shot diagnostic: dump the very first thread detail payload we see
    // for this account so we can inspect the actual messages envelope.
    dumpOnce(
      `airbnb-thread-full-${accountId}`,
      `airbnb-thread-full-${account.accountName.replace(/[^a-z0-9]/gi, '_')}`,
      data,
    );

    // Try known shapes; prefer the full history segment over preview-only
    // inbox connection nodes.
    const candidates = [
      threadData?.messageData?.messages,          // current Airbnb full list
      threadData?.messageData,                    // fallback wrapper
      threadData?.messagesForMessageThreadConnection,
      threadData?.messagesForThread,
      threadData?.allMessages,
      threadData?.messagesConnection,
      threadData?.inboxMessages,
      threadData?.messages,                       // often preview-only edge
      threadData?.messageList,
    ];

    let msgs: any[] = [];
    for (const c of candidates) {
      if (!c) continue;
      if (Array.isArray(c)) {
        if (c.length > 0) { msgs = c; break; }
        continue;
      }
      if (Array.isArray(c.edges)) {
        const arr = c.edges.map((e: any) => e?.node).filter(Boolean);
        if (arr.length > 0) { msgs = arr; break; }
      }
      if (Array.isArray(c.nodes)) {
        if (c.nodes.length > 0) { msgs = c.nodes; break; }
      }
      if (Array.isArray(c.messages)) {
        if (c.messages.length > 0) { msgs = c.messages; break; }
      }
      if (Array.isArray(c.items)) {
        if (c.items.length > 0) { msgs = c.items; break; }
      }
    }

    // Fallback: BFS for any array of message-shaped objects.
    if (msgs.length === 0) {
      msgs = findArrayOfShape(threadData, looksLikeMessage);
    }

    if (msgs.length === 0) {
      console.warn(`[CDP][${account.accountName}] ⚠️  Thread snapshot had 0 messages. Diagnostic:`);
      console.warn(`  threadIdFromUrl:    ${threadId || '(none)'}`);
      console.warn(`  data.data keys:     ${Object.keys(data?.data || {}).join(',')}`);
      console.warn(`  threadData keys:    ${Object.keys(threadData || {}).join(',')}`);
      console.warn(`  nested structure:   ${keyPathsPreview(threadData, 3).substring(0, 500)}`);
      if (data?.errors) {
        console.warn(`  errors:             ${JSON.stringify(data.errors).substring(0, 300)}`);
      }
      try {
        console.warn(`  sample:             ${JSON.stringify(data).substring(0, 2400)}`);
      } catch { /* ignore */ }
      return;
    }

    const resolvedThreadId = threadId || decodeAirbnbGlobalId(threadData?.id) || '';
    if (!resolvedThreadId) {
      console.warn(`[CDP][${account.accountName}] Thread snapshot missing threadId`);
      return;
    }
    const hostAccountId = resolveAirbnbHostAccountId(account, threadData);
    if (hostAccountId && account.platformUserId !== hostAccountId) {
      account.platformUserId = hostAccountId;
    }

    console.log(`[CDP][${account.accountName}] 📜  Airbnb thread ${resolvedThreadId}: ${msgs.length} message(s)`);

    // One-shot diagnostic: dump the first message object so we can see the
    // exact field names for text / sender / timestamps.
    dumpOnce(
      `airbnb-thread-msg-${accountId}`,
      `airbnb-thread-message-${account.accountName.replace(/[^a-z0-9]/gi, '_')}`,
      msgs[0],
    );

    let newCount = 0;
    for (const m of msgs) {
      const senderId = String(
        m.senderId ||
        m.account?.accountId ||
        decodeAirbnbGlobalId(m.sender?.id) ||
        m.sender?.id ||
        ''
      );
      const text = extractAirbnbMessageText(m);

      const isNew = await this.saveMessage({
        accountId,
        platform:       'airbnb',
        threadId:       resolvedThreadId,
        platformMsgId:  String(decodeAirbnbGlobalId(m.id) || m.messageId || ''),
        isFromMe:       (
          m.role === 'HOST'
          || (hostAccountId && senderId === hostAccountId)
          || (account.platformUserId && senderId === account.platformUserId)
        ) ? 1 : 0,
        guestName:      m.author?.firstName || m.sender?.firstName || m.senderName || account.accountName,
        messageText:    text,
        sentAt:         m.createdAtMs || m.createdAt || m.created_at || m.updatedAtMs || new Date().toISOString(),
        raw:            m,
      });
      if (isNew) newCount++;
    }

    this.emitNewMessages(accountId, 'airbnb', account.accountName, newCount);
  }

  // ── Process Gathern chat snapshot (captured via CDP) ──────────────────────
  // Handles both /user_chat/chats (inbox list) and /user_chat/messages
  // (thread history). The shape is distinguished by which top-level key is
  // present in the response.

  private async processGathernChatSnapshot(accountId: string, data: any, url: string) {
    const account = browserSessions.get(accountId);
    if (!account) return;

    const chats: any[] = data?.contact_list || data?.data?.chats || [];
    if (chats.length > 0) {
      const myUid: string | null =
        account.platformUserId ||
        (account.chatAuthToken?.includes('|') ? account.chatAuthToken.split('|')[0] : null);

      // Verify-end-to-end debug: confirm Gathern inbox family flows through.
      console.log(`[CDP][${account.accountName}] 💬  Gathern inbox: ${chats.length} chat(s)`);

      let newCount = 0;
      for (const c of chats) {
        const msg       = c.last_message || {};
        const senderId  = String(msg.sender_id || '');
        const text      = msg.message || msg.body || '';
        const rawTime   = msg.created_at || c.updated_at || 0;
        const stableTime = Math.floor(Number(rawTime));
        const stableId  = msg.id || msg.message_id
          || `s-g1-${c.chat_uid}-${senderId}-${stableTime}-${text.trim().substring(0, 40)}`;
        const threadId  = String(c.chat_uid || c.id || '');
        if (!threadId) continue;

        const isNew = await this.saveMessage({
          accountId,
          platform:       'gathern',
          threadId,
          platformMsgId:  String(stableId),
          isFromMe:       (myUid && senderId === myUid) || (c.provider_id && senderId === String(c.provider_id)) ? 1 : 0,
          guestName:      c.name || c.name_verified || 'Guest',
          messageText:    text,
          sentAt:         msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString(),
          raw:            c,
        });
        if (isNew) newCount++;

        await this.upsertThreadMeta(accountId, threadId, 'gathern', {
          unit_id:        c.unit_id    || c.chalet_id  || null,
          chalet_id:      c.chalet_id  || c.unit_id    || null,
          reservation_id: c.reservation_id || null,
          guest_name:     c.name       || c.name_verified || null,
        });
      }

      this.emitNewMessages(accountId, 'gathern', account.accountName, newCount);
      return;
    }

    const msgs: any[] = data?.messages || data?.data?.messages || [];
    if (msgs.length > 0) {
      const myUid: string | null =
        account.platformUserId ||
        (account.chatAuthToken?.includes('|') ? account.chatAuthToken.split('|')[0] : null);

      // Thread id is in the request body, which CDP doesn't give us here —
      // extract from any message that references it. If unavailable, skip
      // writing thread-scoped rows (safer than mis-attributing them).
      const threadIdFromMsg = String(msgs[0]?.chat_uid || msgs[0]?.thread_uid || '');
      if (!threadIdFromMsg) {
        console.warn(`[CDP][${account.accountName}] Gathern thread snapshot missing chat_uid`);
        return;
      }

      // Verify-end-to-end debug: confirm Gathern thread family flows through.
      console.log(`[CDP][${account.accountName}] 📜  Gathern thread ${threadIdFromMsg}: ${msgs.length} message(s)`);

      let newCount = 0;
      for (const m of msgs) {
        const senderId = String(m.sender_id || '');
        const stableId = m.id || m.message_id || `s-g2-${threadIdFromMsg}-${senderId}-${m.created_at}`;
        const isNew = await this.saveMessage({
          accountId,
          platform:       'gathern',
          threadId:       threadIdFromMsg,
          platformMsgId:  String(stableId),
          isFromMe:       (myUid && senderId === myUid) || m.is_provider ? 1 : 0,
          guestName:      m.sender_name || 'Guest',
          messageText:    m.message || m.body || '',
          sentAt:         m.created_at ? new Date(m.created_at * 1000).toISOString() : new Date().toISOString(),
          raw:            m,
        });
        if (isNew) newCount++;
      }
      this.emitNewMessages(accountId, 'gathern', account.accountName, newCount);
    }
  }
}
