import { session, net, BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface BrowserAccountSession {
  id: string;
  platform: 'airbnb' | 'gathern' | 'whatsapp';
  accountName: string;
  partition: string;
  createdBy: string;
  authToken?: string;
  chatAuthToken?: string;
  platformUserId?: string;
  window?: BrowserWindow;
}

export const browserSessions: Map<string, BrowserAccountSession> = new Map();

export interface SessionHealthResult {
  healthy: boolean;
  reason: string;
}

// ─────────────────────────────────────────────
// Session persistence (file-based)
// ─────────────────────────────────────────────

export function loadSavedSessions(): BrowserAccountSession[] {
  try {
    const sessionsPath = path.join(app.getPath('userData'), 'sessions.json');
    if (fs.existsSync(sessionsPath)) {
      return JSON.parse(fs.readFileSync(sessionsPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return [];
}

export function saveSessions() {
  try {
    const sessionsPath = path.join(app.getPath('userData'), 'sessions.json');
    const data = Array.from(browserSessions.values()).map(s => ({
      id: s.id,
      platform: s.platform,
      accountName: s.accountName,
      partition: s.partition,
      createdBy: s.createdBy,
      authToken: s.authToken,
      chatAuthToken: s.chatAuthToken,
      platformUserId: s.platformUserId,
    }));
    fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2));
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────
// Cookie helpers
// ─────────────────────────────────────────────

const AIRBNB_COOKIE_DOMAINS   = ['.airbnb.com', 'www.airbnb.com', 'airbnb.com'];
const GATHERN_COOKIE_DOMAINS  = ['.gathern.co', 'gathern.co', 'business.gathern.co', 'api.gathern.co', 'chatapi-prod.gathern.co'];

export async function getCookiesForAccount(account: BrowserAccountSession): Promise<string> {
  const partitionName = account.partition.startsWith('persist:') ? account.partition : `persist:${account.partition}`;
  const ses = session.fromPartition(partitionName);
  let cookies: Electron.Cookie[] = [];

  const domains = account.platform === 'airbnb' ? AIRBNB_COOKIE_DOMAINS : GATHERN_COOKIE_DOMAINS;
  for (const domain of domains) {
    const c = await ses.cookies.get({ domain });
    cookies.push(...c);
  }

  const seen = new Set<string>();
  const unique = cookies.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });

  return unique.map(c => `${c.name}=${c.value}`).join('; ');
}

// ─────────────────────────────────────────────
// Internal HTTP layer — Hybrid bridge-first
// ─────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Makes an API call, preferring the webview bridge (page context) when a
 * BrowserWindow is open for the account, falling back to main-process net.fetch.
 *
 * Using the bridge helps because:
 *   - Cookies in the page context are always fresh
 *   - Some requests are blocked outside the page origin (CORS / ERR_BLOCKED_BY_CLIENT)
 */
async function apiCall(
  url: string,
  cookieStr: string,
  extraHeaders: Record<string, string> = {},
  options: {
    method?:      string;
    body?:        string;
    partition?:   string;
    account?:     BrowserAccountSession;
  } = {}
): Promise<any> {
  const { method = 'GET', body, partition, account } = options;

  const headers: Record<string, string> = {
    'Cookie':          cookieStr,
    'User-Agent':      UA,
    'Accept':          'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'sec-fetch-dest':  'empty',
    'sec-fetch-mode':  'cors',
    'sec-fetch-site':  'same-site',
    ...extraHeaders,
  };

  // ── Try webview bridge first if window is open ────────────────────────────
  if (account?.window && !account.window.isDestroyed()) {
    try {
      const result = await dispatchFetchViaBridge(account, url, { method, headers, body });
      return result;
    } catch (bridgeErr: any) {
      console.warn(`[Platform API] Bridge failed (${bridgeErr.message}), falling back to net.fetch`);
    }
  }

  // ── Fallback: main-process net.fetch ──────────────────────────────────────
  const currentSession = partition ? session.fromPartition(partition) : null;

  const fetchOptions: any = { method, headers, body };
  const response = await (currentSession
    ? currentSession.fetch(url, fetchOptions)
    : net.fetch(url, fetchOptions));

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${err.substring(0, 120)}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────
// Webview fetch bridge (page-context execution)
// ─────────────────────────────────────────────

const pendingBridgeRequests = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();

/** Called from main.ts when `exec-fetch-response` IPC arrives */
export function resolveBridgeResponse(response: { requestId: string; success: boolean; data?: any; error?: string }) {
  const pending = pendingBridgeRequests.get(response.requestId);
  if (!pending) return;
  pendingBridgeRequests.delete(response.requestId);
  if (response.success) {
    pending.resolve(response.data);
  } else {
    pending.reject(new Error(response.error || 'Bridge fetch failed'));
  }
}

async function dispatchFetchViaBridge(account: BrowserAccountSession, url: string, options: any): Promise<any> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('Window not available for bridge');
  }

  const requestId = `br-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // When using the bridge (page context), send ONLY method + body.
  // The browser already has the correct cookies, CSRF token, and all other
  // headers from the live session — injecting our own headers causes the
  // Airbnb GraphQL server to return a ValidationError.
  const bridgeOptions = {
    method:  options.method || 'GET',
    body:    options.body   || undefined,
    // No headers — let the browser use the page's own headers
  };

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingBridgeRequests.delete(requestId);
      reject(new Error('Bridge request timed out (15s)'));
    }, 15_000);

    pendingBridgeRequests.set(requestId, {
      resolve: (v) => { clearTimeout(timeout); resolve(v); },
      reject:  (e) => { clearTimeout(timeout); reject(e); },
    });

    account.window!.webContents.send('exec-fetch', { url, options: bridgeOptions, requestId });
  });
}

// ─────────────────────────────────────────────
// Airbnb UI-composer send fallback (most resilient)
// ─────────────────────────────────────────────

async function navigateWindowToAirbnbThread(win: BrowserWindow, threadId: string): Promise<void> {
  const targetUrl = `https://www.airbnb.com/hosting/messages/${threadId}`;
  const currentUrl = win.webContents.getURL() || '';
  if (currentUrl.includes(`/hosting/messages/${threadId}`)) return;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { win.webContents.removeListener('did-finish-load', onLoad); } catch {}
      resolve();
    };
    const onLoad = () => finish();
    win.webContents.once('did-finish-load', onLoad);
    win.webContents.loadURL(targetUrl).catch(() => finish());
    setTimeout(finish, 8_000);
  });
}

async function sendAirbnbMessageViaComposer(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('Airbnb window is not open');
  }

  await navigateWindowToAirbnbThread(account.window, threadId);

  const script = `
    (async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const msg = ${JSON.stringify(message.trim())};
      const isVisible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return !!(r.width > 10 && r.height > 10 && st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0');
      };
      const allRoots = () => {
        const roots = [document];
        const walk = (node) => {
          if (!node || !node.querySelectorAll) return;
          const all = node.querySelectorAll('*');
          for (const el of all) {
            if (el.shadowRoot) roots.push(el.shadowRoot);
            if (el.tagName === 'IFRAME') {
              try {
                if (el.contentDocument) roots.push(el.contentDocument);
              } catch {}
            }
          }
        };
        for (let i = 0; i < roots.length; i++) walk(roots[i]);
        return roots;
      };
      const collect = (selectors) => {
        const out = [];
        for (const root of allRoots()) {
          for (const s of selectors) {
            try { out.push(...Array.from(root.querySelectorAll(s))); } catch {}
          }
        }
        return out.filter(isVisible);
      };
      const findComposer = () => {
        const selectors = [
          'textarea[placeholder*="message" i]',
          'textarea[placeholder*="write" i]',
          'textarea[placeholder*="reply" i]',
          'textarea[placeholder*="رسالة" i]',
          'textarea[aria-label*="message" i]',
          'textarea',
          '[role="textbox"]',
          '[role="textbox"][contenteditable="true"]',
          'div[contenteditable="true"]',
          '[data-testid*="composer" i] [contenteditable="true"]',
          '[data-testid*="composer" i] [role="textbox"]',
          '[data-testid*="message" i] [contenteditable="true"]',
          '[data-testid*="message" i] [role="textbox"]',
        ];
        const candidates = collect(selectors);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          // Prefer lower (chat composer is near bottom) and larger inputs.
          return (br.bottom - ar.bottom) || ((br.width * br.height) - (ar.width * ar.height));
        });
        return candidates[0];
      };
      const findSendButton = (composer) => {
        const selectors = [
          'button[type="submit"]',
          'button[aria-label*="send" i]',
          'button[aria-label*="إرسال" i]',
          'button[data-testid*="send" i]',
          'button[data-testid*="submit" i]',
          '[role="button"][aria-label*="send" i]',
        ];
        const btns = collect(selectors);
        const isQuickReplyLike = (btn) => {
          const text = [
            btn?.getAttribute?.('aria-label') || '',
            btn?.getAttribute?.('title') || '',
            btn?.textContent || '',
            btn?.getAttribute?.('data-testid') || '',
          ].join(' ').toLowerCase();
          return (
            text.includes('quick') ||
            text.includes('reply') ||
            text.includes('replies') ||
            text.includes('رد') ||
            text.includes('reply32') ||
            text.includes('quick_repl')
          );
        };
        const cr = composer?.getBoundingClientRect?.();
        if (cr) {
          // Prefer buttons close to composer (usually same compose bar).
          const scored = btns
            .filter((btn) =>
              !btn.disabled &&
              btn.getAttribute('aria-disabled') !== 'true' &&
              !isQuickReplyLike(btn)
            )
            .map((btn) => {
              const br = btn.getBoundingClientRect();
              const dx = Math.abs((br.left + br.width / 2) - (cr.left + cr.width / 2));
              const dy = Math.abs((br.top + br.height / 2) - (cr.top + cr.height / 2));
              const score = dx + dy;
              return { btn, score };
            })
            .sort((a, b) => a.score - b.score);
          if (scored[0]) return scored[0].btn;
        }
        for (const btn of btns) {
          if (!btn.disabled && btn.getAttribute('aria-disabled') !== 'true' && !isQuickReplyLike(btn)) return btn;
        }
        return null;
      };
      const setComposerValue = (composer, value) => {
        composer.focus();
        if (composer.tagName === 'TEXTAREA' || composer.tagName === 'INPUT') {
          const proto = composer.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setter) setter.call(composer, value);
          else composer.value = value;
          composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: value, inputType: 'insertText' }));
          composer.dispatchEvent(new Event('input', { bubbles: true }));
          composer.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
        // For contenteditable editors (Airbnb), do a single write path.
        // Multiple write paths (textContent + innerText + execCommand) can
        // duplicate the same text in one outgoing message.
        composer.textContent = value;
        composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: value, inputType: 'insertText' }));
        composer.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
      };
      for (let i = 0; i < 30; i++) {
        let composer = findComposer();
        if (!composer) {
          await sleep(180);
          continue;
        }

        setComposerValue(composer, msg);
        await sleep(180);

        const sendBtn = findSendButton(composer);
        if (sendBtn) {
          sendBtn.click();
          return { ok: true, via: 'composer-button' };
        }

        // Fallback key combos.
        composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        composer.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', bubbles: true }));
        composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, ctrlKey: true }));
        composer.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', bubbles: true, ctrlKey: true }));
        return { ok: true, via: 'composer-enter' };
      }

      // Extra diagnostics to avoid blind failures.
      const textareas = collect(['textarea']).length;
      const editables = collect(['[contenteditable="true"]', '[role="textbox"]']).length;
      const buttons = collect(['button']).length;
      return { ok: false, error: 'composer_not_found_or_not_ready', debug: { textareas, editables, buttons, url: location.href } };
    })();
  `;

  const result: any = await account.window.webContents.executeJavaScript(script, true);
  if (!result?.ok) {
    const dbg = result?.debug ? ` | debug=${JSON.stringify(result.debug)}` : '';
    throw new Error((result?.error || 'Failed to send via Airbnb composer') + dbg);
  }
  return true;
}

// ─────────────────────────────────────────────
// Session health check
// ─────────────────────────────────────────────

export async function checkSessionHealth(account: BrowserAccountSession): Promise<SessionHealthResult> {
  try {
    const cookies = await getCookiesForAccount(account);
    if (!cookies || cookies.length < 10) {
      return { healthy: false, reason: 'no_cookies' };
    }
    if (account.platform === 'airbnb') {
      const ok = cookies.includes('_airbed_session_id') || cookies.includes('bev');
      return ok ? { healthy: true, reason: 'ok' } : { healthy: false, reason: 'missing_airbnb_session_cookie' };
    }
    if (account.platform === 'gathern') {
      const hasCookie = cookies.includes('__QV1xD') || cookies.includes('cf_clearance') || cookies.includes('gathern_session');
      if (!hasCookie) return { healthy: false, reason: 'missing_gathern_session_cookie' };
      if (!account.chatAuthToken) return { healthy: false, reason: 'missing_gathern_bearer_token' };
      return { healthy: true, reason: 'ok' };
    }
    return { healthy: true, reason: 'ok' };
  } catch (e: any) {
    return { healthy: false, reason: `exception: ${e.message}` };
  }
}

// ─────────────────────────────────────────────
// AIRBNB — common headers + API key (used by send)
// ─────────────────────────────────────────────

// Airbnb's public web API key (same for every browser — embedded in the web app).
// Required: the GraphQL endpoint returns `{"error":"invalid_key"}` without it.
const AIRBNB_API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';

// Minimal common headers for the net.fetch fallback path when sending a
// message from outside the page context.
const AIRBNB_COMMON_HEADERS = {
  'Origin':                           'https://www.airbnb.com',
  'Referer':                          'https://www.airbnb.com/hosting/inbox',
  'x-airbnb-api-key':                 AIRBNB_API_KEY,
  'x-airbnb-graphql-platform':        'web',
  'x-airbnb-graphql-platform-client': 'minimalist-niobe',
  'Accept':                           'application/json',
};

// Message reads are captured via CDP (see electron/cdp-interceptor.ts).
// No read-path functions live here anymore.

// ─────────────────────────────────────────────
// GATHERN — get unit/chalet IDs for a thread
//   looks in DB platform_thread_metadata first,
//   then falls back to last raw_data in memory
// ─────────────────────────────────────────────

async function getGathernThreadMeta(
  accountId: string,
  threadId: string,
  pool: any
): Promise<{ unit_id: string | null; chalet_id: string | null }> {
  try {
    const [rows]: any = await pool.execute(
      `SELECT unit_id, chalet_id FROM platform_thread_metadata
       WHERE browser_account_id = ? AND thread_id = ?
       LIMIT 1`,
      [accountId, threadId]
    );
    if (rows?.length && (rows[0].unit_id || rows[0].chalet_id)) {
      return { unit_id: rows[0].unit_id, chalet_id: rows[0].chalet_id || rows[0].unit_id };
    }
  } catch { /* DB not always available from here */ }

  // Fallback: try to extract from last message's raw_data for this thread in memory
  return { unit_id: null, chalet_id: null };
}

// Exported so polling-service can pass the pool
export let _dbPool: any = null;
export function setDbPool(pool: any) { _dbPool = pool; }

// ─────────────────────────────────────────────
// GATHERN — Send message
// ─────────────────────────────────────────────

export async function sendGathernMessage(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {
  const chatToken = account.chatAuthToken || account.authToken;
  if (!chatToken) throw new Error('Chat token not found — please open Gathern window first');

  // Get unit_id from thread metadata
  const meta = await getGathernThreadMeta(account.id, threadId, _dbPool);
  const unitId   = meta.unit_id   ? Number(meta.unit_id)   : null;
  const chaletId = meta.chalet_id ? Number(meta.chalet_id) : null;

  if (!unitId) {
    throw new Error(
      'لا يمكن الرد: لم يُعثر على معرّف الوحدة (unit_id) لهذه المحادثة. افتح نافذة جاذر إن ثم حاول مرة أخرى.'
    );
  }

  const url = 'https://chatapi-prod.gathern.co/v1/business/message/send';
  const payload = {
    chat_uid:  threadId,
    message,
    type:      'text',
    chat_type: 2,
    unit_id:   unitId,
    chalet_id: chaletId || unitId,
    unitId:    unitId,
  };

  const fetchOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${chatToken}`,
      'Content-Type':  'application/json',
      'Origin':        'https://business.gathern.co',
      'Referer':       `https://business.gathern.co/app/chat/${threadId}`,
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    body: JSON.stringify(payload),
  };

  // Prefer bridge (page-context) for Gathern because the API validates referrer
  let res: any;
  if (account.window && !account.window.isDestroyed()) {
    res = await dispatchFetchViaBridge(account, url, fetchOptions);
  } else {
    const cookies = await getCookiesForAccount(account);
    res = await apiCall(url, cookies, {}, {
      method:    'POST',
      body:      JSON.stringify(payload),
      partition: account.partition,
      account,
    });
  }

  console.log('[Gathern] Send response:', JSON.stringify(res).substring(0, 200));
  return true;
}

// ─────────────────────────────────────────────
// AIRBNB — Send message
// ─────────────────────────────────────────────

// Known working hash for sending a message on Airbnb hosting inbox
const AIRBNB_SEND_HASH = 'b9672a3f2dcf1b5b571dc80e02c93b52a7d5dfa46ee22b18a1e8c3b2e49c5678';

export async function sendAirbnbMessage(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('نافذة Airbnb مقفولة. افتح الحساب من صفحة المتصفح ثم أعد الإرسال.');
  }

  const cookies = await getCookiesForAccount(account);
  if (!cookies) throw new Error('No cookies found for this Airbnb session');

  // Airbnb uses a POST GraphQL mutation to send messages
  const url = `https://www.airbnb.com/api/v3/SendMessageThread/${AIRBNB_SEND_HASH}`;

  const payload = JSON.stringify({
    operationName: 'SendMessageThread',
    variables: {
      threadId: String(threadId),
      message:  message.trim(),
      type:     'TEXT',
    },
    extensions: {
      persistedQuery: { version: 1, sha256Hash: AIRBNB_SEND_HASH },
    },
  });

  const headers = {
    ...AIRBNB_COMMON_HEADERS,
    'Content-Type': 'application/json',
  };

  // Most reliable path: send through Airbnb's own composer in page context.
  try {
    const ok = await sendAirbnbMessageViaComposer(account, threadId, message);
    if (ok) return true;
  } catch (uiErr: any) {
    console.warn('[Airbnb] Composer send failed, trying API fallback:', uiErr.message);
  }

  // Fallback 1: bridge API call (if composer path fails)
  try {
    const res = await dispatchFetchViaBridge(account, url, {
      method: 'POST',
      headers,
      body: payload,
    });
    console.log('[Airbnb] Send (bridge) response:', JSON.stringify(res).substring(0, 200));
    if (res?.errors?.length) {
      throw new Error(res.errors[0]?.message || 'Airbnb API error');
    }
    return true;
  } catch (bridgeErr: any) {
    console.warn('[Airbnb] Bridge send failed:', bridgeErr.message);
  }

  // Fallback 2: direct net.fetch with cookies (may fail on CSRF/hash rotation)
  const data = await apiCall(url, cookies, headers, {
    method:    'POST',
    body:      payload,
    partition: account.partition,
    account,
  });

  if (data?.errors?.length) {
    throw new Error(data.errors[0]?.message || 'Airbnb API error');
  }

  console.log('[Airbnb] Send (direct) response:', JSON.stringify(data).substring(0, 200));
  return true;
}

// ─────────────────────────────────────────────
// Unified send dispatcher
// ─────────────────────────────────────────────

export async function sendPlatformMessage(
  accountId: string,
  threadId:  string,
  message:   string
): Promise<boolean> {
  const account = browserSessions.get(accountId);
  if (!account) throw new Error('Account session not found in memory');

  if (account.platform === 'gathern') {
    return sendGathernMessage(account, threadId, message);
  }

  if (account.platform === 'airbnb') {
    return sendAirbnbMessage(account, threadId, message);
  }

  throw new Error(`Platform "${account.platform}" is not supported for replies`);
}
