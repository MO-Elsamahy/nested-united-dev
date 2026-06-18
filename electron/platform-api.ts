import { session, net, BrowserWindow, app } from 'electron';
import { BrowserAccountSession, SessionHealthResult } from './types';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';

// ─────────────────────────────────────────────
// Session state
// ─────────────────────────────────────────────

export const browserSessions: Map<string, BrowserAccountSession> = new Map();

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

const AIRBNB_COOKIE_DOMAINS = ['.airbnb.com', 'www.airbnb.com', 'airbnb.com'];
const GATHERN_COOKIE_DOMAINS = ['.gathern.co', 'gathern.co', 'business.gathern.co', 'api.gathern.co', 'chatapi-prod.gathern.co'];

export async function getCookiesForAccount(account: BrowserAccountSession): Promise<string> {
  const partitionName = account.partition.startsWith('persist:') ? account.partition : `persist:${account.partition}`;
  const ses = session.fromPartition(partitionName);
  const cookies: Electron.Cookie[] = [];

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
async function apiCall<T = unknown>(
  url: string,
  cookieStr: string,
  extraHeaders: Record<string, string> = {},
  options: {
    method?: string;
    body?: string;
    partition?: string;
    account?: BrowserAccountSession;
  } = {}
): Promise<T> {
  const { method = 'GET', body, partition, account } = options;

  const headers: Record<string, string> = {
    'Cookie': cookieStr,
    'User-Agent': UA,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    ...extraHeaders,
  };

  // ── Try webview bridge first if window is open ────────────────────────────
  if (account?.window && !account.window.isDestroyed()) {
    try {
      const result = await dispatchFetchViaBridge<T>(account, url, { method, headers, body });
      return result;
    } catch (bridgeErr) {
      console.warn(`[Platform API] Bridge failed (${bridgeErr instanceof Error ? bridgeErr.message : bridgeErr}), falling back to net.fetch`);
    }
  }

  // ── Fallback: main-process net.fetch ──────────────────────────────────────
  const currentSession = partition ? session.fromPartition(partition) : null;

  // Clean headers to avoid Electron net::ERR_INVALID_ARGUMENT
  const cleanHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined && v !== null && v !== 'undefined' && v !== 'null' && String(v).trim() !== '') {
      cleanHeaders[k] = String(v);
    }
  }

  const fetchOptions: RequestInit = { method, headers: cleanHeaders };
  if (body !== undefined && body !== null) {
    fetchOptions.body = body;
  }
  const response = await (currentSession
    ? currentSession.fetch(url, fetchOptions)
    : net.fetch(url, fetchOptions));

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${err.substring(0, 120)}`);
  }
  return response.json() as Promise<T>;
}

// ─────────────────────────────────────────────
// Webview fetch bridge (page-context execution)
// ─────────────────────────────────────────────

const pendingBridgeRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

/** Called from main.ts when `exec-fetch-response` IPC arrives */
export function resolveBridgeResponse(response: { requestId: string; success: boolean; data?: unknown; error?: string }) {
  const pending = pendingBridgeRequests.get(response.requestId);
  if (!pending) return;
  pendingBridgeRequests.delete(response.requestId);
  if (response.success) {
    pending.resolve(response.data);
  } else {
    pending.reject(new Error(response.error || 'Bridge fetch failed'));
  }
}

async function dispatchFetchViaBridge<T = unknown>(account: BrowserAccountSession, url: string, options: { method?: string; body?: string; headers?: Record<string, string> }): Promise<T> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('Window not available for bridge');
  }

  const requestId = `br-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // When using the bridge (page context) for Airbnb, send ONLY method + body.
  // The browser already has the correct cookies, CSRF token, etc.
  // For Gathern, we need to pass the Authorization/Content-Type headers because Gathern uses token-based auth.
  const bridgeOptions: any = {
    method: options.method || 'GET',
    body: options.body || undefined,
  };

  if (url.includes('gathern.co') && options.headers) {
    const allowed = ['authorization', 'content-type'];
    const cleanHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(options.headers)) {
      if (allowed.includes(k.toLowerCase())) {
        cleanHeaders[k] = v;
      }
    }
    bridgeOptions.headers = cleanHeaders;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingBridgeRequests.delete(requestId);
      reject(new Error('Bridge request timed out (15s)'));
    }, 15_000);

    pendingBridgeRequests.set(requestId, {
      resolve: (v) => { clearTimeout(timeout); resolve(v as T); },
      reject: (e) => { clearTimeout(timeout); reject(e); },
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
      try { win.webContents.removeListener('did-finish-load', onLoad); } catch { }
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

  const result = await account.window.webContents.executeJavaScript(script, true) as { ok: boolean; via?: string; error?: string; debug?: Record<string, unknown> };
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
  } catch (e) {
    return { healthy: false, reason: `exception: ${e instanceof Error ? e.message : e}` };
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
  'Origin': 'https://www.airbnb.com',
  'Referer': 'https://www.airbnb.com/hosting/inbox',
  'x-airbnb-api-key': AIRBNB_API_KEY,
  'x-airbnb-graphql-platform': 'web',
  'x-airbnb-graphql-platform-client': 'minimalist-niobe',
  'Accept': 'application/json',
};

// Message reads are captured via CDP (see electron/cdp-interceptor.ts).
// No read-path functions live here anymore.

// ─────────────────────────────────────────────
// GATHERN — get unit/chalet IDs for a thread
//   looks in DB platform_thread_metadata first,
//   then falls back to last raw_data in memory
// ─────────────────────────────────────────────

interface GathernThreadMeta {
  unit_id: string | null;
  chalet_id: string | null;
}

interface DbPool {
  execute: (sql: string, params: unknown[]) => Promise<[unknown[], unknown]>;
}

async function getGathernThreadMeta(
  accountId: string,
  threadId: string,
  pool: DbPool
): Promise<GathernThreadMeta> {
  try {
    const [rows] = await pool.execute(
      `SELECT unit_id, chalet_id FROM platform_thread_metadata
       WHERE browser_account_id = ? AND thread_id = ?
       LIMIT 1`,
      [accountId, threadId]
    ) as [GathernThreadMeta[], unknown];
    if (rows?.length && (rows[0].unit_id || rows[0].chalet_id)) {
      return { unit_id: rows[0].unit_id, chalet_id: rows[0].chalet_id || rows[0].unit_id };
    }
  } catch { /* DB not always available from here */ }

  // Fallback: try to extract from last message's raw_data for this thread in memory
  return { unit_id: null, chalet_id: null };
}

// Exported so polling-service can pass the pool
export let _dbPool: DbPool | null = null;
export function setDbPool(pool: DbPool) { _dbPool = pool; }

// ─────────────────────────────────────────────
// GATHERN — Ensure window is on chat page (SPA)
// ─────────────────────────────────────────────

async function ensureGathernChatPage(win: BrowserWindow): Promise<void> {
  const currentUrl = win.webContents.getURL() || '';

  // Already on the chat page — don't navigate
  if (currentUrl.includes('business.gathern.co/app/chat')) return;

  // Navigate to the base chat page (Gathern is an SPA, threads are selected inside the app)
  const chatUrl = 'https://business.gathern.co/app/chat';

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      try { win.webContents.removeListener('did-finish-load', onLoad); } catch { }
      resolve();
    };
    const onLoad = () => finish();
    win.webContents.once('did-finish-load', onLoad);
    win.webContents.loadURL(chatUrl).catch(() => finish());
    setTimeout(finish, 10_000);
  });

  // Wait for SPA to render
  await new Promise(r => setTimeout(r, 1000));
}

// ─────────────────────────────────────────────
// GATHERN — Send message via UI composer injection
// ─────────────────────────────────────────────

async function sendGathernMessageViaComposer(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('Gathern window is not open — please open it first');
  }

  await ensureGathernChatPage(account.window);

  // The injected script:
  // 1. Finds the chat thread in the sidebar by matching chat_uid / data attributes / text
  // 2. Clicks it and waits for the composer to appear
  // 3. Types the message and clicks send
  const script = `
    (async () => {
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));
      const msg = ${JSON.stringify(message.trim())};
      const threadId = ${JSON.stringify(threadId)};
      const isVisible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const st = window.getComputedStyle(el);
        return !!(r.width > 5 && r.height > 5 && st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0');
      };
      const collect = (selectors) => {
        const out = [];
        for (const s of selectors) {
          try { out.push(...Array.from(document.querySelectorAll(s))); } catch {}
        }
        return out.filter(isVisible);
      };

      // ── Step 1: Find and click the correct chat thread ──
      // Gathern SPA renders a chat list. We search for any element containing our threadId.
      const findAndClickThread = async () => {
        // Try to find any element whose text, href, data-*, or onclick contains the threadId
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          // Check data attributes
          for (const attr of el.attributes || []) {
            if (attr.value && typeof attr.value === 'string' && attr.value.includes(threadId)) {
              // Found an element referencing our thread — click the nearest clickable ancestor
              const clickable = el.closest('a, button, [role="button"], li, div[class*="chat"], div[class*="item"], div[class*="conversation"]') || el;
              if (isVisible(clickable)) {
                clickable.click();
                return true;
              }
            }
          }
          // Check href safely (SVG elements have href as an object, not a string)
          if (el.href && typeof el.href === 'string' && el.href.includes(threadId)) {
            el.click();
            return true;
          }
        }
        // Fallback: look for Angular/React rendered elements via innerHTML scan
        // This is expensive but thorough
        const containers = document.querySelectorAll('[class*="chat"], [class*="conversation"], [class*="contact"], [class*="thread"], li, .list-group-item');
        for (const c of containers) {
          if (c.innerHTML && typeof c.innerHTML === 'string' && c.innerHTML.includes(threadId) && isVisible(c)) {
            c.click();
            return true;
          }
        }
        return false;
      };

      let threadClicked = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        threadClicked = await findAndClickThread();
        if (threadClicked) break;
        await sleep(100);
      }

      // Wait for the chat to load after clicking
      if (threadClicked) {
        await sleep(300);
      }

      // ── Step 2: Find the composer ──
      const findComposer = () => {
        const selectors = [
          'textarea[placeholder*="اكتب" i]',
          'textarea[placeholder*="رسالة" i]',
          'textarea[placeholder*="message" i]',
          'textarea[placeholder*="write" i]',
          'textarea[placeholder*="reply" i]',
          'textarea[placeholder*="type" i]',
          'input[placeholder*="اكتب" i]',
          'input[placeholder*="رسالة" i]',
          'input[placeholder*="message" i]',
          'textarea',
          '[role="textbox"]',
          '[contenteditable="true"]',
        ];
        const candidates = collect(selectors);
        if (candidates.length === 0) return null;
        // Prefer lower (composer is near bottom) and larger inputs
        candidates.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (br.bottom - ar.bottom) || ((br.width * br.height) - (ar.width * ar.height));
        });
        return candidates[0];
      };

      // ── Step 3: Find the send button ──
      const findSendButton = () => {
        const allBtns = collect(['button', '[role="button"]']);
        for (const btn of allBtns) {
          const img = btn.querySelector('img');
          if (img && (img.alt.includes('إرسال') || img.src.includes('send.svg'))) {
            return btn;
          }
        }
        return null;
      };

      // ── Step 4: Type and send ──
      const setComposerValue = async (composer, value) => {
        composer.focus();
        
        // 1. Clear existing text
        const proto = window.HTMLTextAreaElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(composer, '');
        else composer.value = '';
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        
        await sleep(50);
        
        // 2. Insert text via execCommand (this is the most reliable way to trick React into updating state)
        document.execCommand('insertText', false, value);
        
        // 3. Dispatch manual events as backup
        composer.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, data: value, inputType: 'insertText' }));
        composer.dispatchEvent(new Event('input', { bubbles: true }));
        composer.dispatchEvent(new Event('change', { bubbles: true }));
      };

      for (let i = 0; i < 30; i++) {
        let composer = findComposer();
        if (!composer) {
          await sleep(100);
          continue;
        }

        await setComposerValue(composer, msg);
        
        // Wait for React to update the state and enable the send button
        let sendBtn = null;
        for (let j = 0; j < 20; j++) {
          await sleep(50);
          sendBtn = findSendButton();
          if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
            break; // Button is now enabled!
          }
        }

        if (sendBtn && !sendBtn.disabled) {
          sendBtn.click();
          return { ok: true, via: 'composer-button', threadClicked };
        }

        // Fallback: press Enter key if button still disabled or not found
        composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        composer.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', bubbles: true }));
        return { ok: true, via: 'composer-enter', threadClicked };
      }

      // Diagnostics
      const textareas = collect(['textarea']).length;
      const inputs = collect(['input']).length;
      const editables = collect(['[contenteditable="true"]', '[role="textbox"]']).length;
      const buttons = collect(['button']).length;
      
      return { 
        ok: false, 
        error: 'gathern_composer_not_found_or_button_disabled', 
        debug: { textareas, inputs, editables, buttons, url: location.href, threadClicked },
      };
    })();
  `;

  const result = await account.window.webContents.executeJavaScript(script, true) as { 
    ok: boolean; 
    via?: string; 
    error?: string; 
    debug?: Record<string, unknown>; 
    threadClicked?: boolean;
  };
  if (!result?.ok) {
    const dbg = result?.debug ? ` | debug=${JSON.stringify(result.debug)}` : '';
    throw new Error((result?.error || 'Failed to send via Gathern composer') + dbg);
  }
  console.log(`[Gathern] ✅ Message sent via composer (${result.via}, threadClicked=${result.threadClicked})`);
  return true;
}

// ─────────────────────────────────────────────
// GATHERN — Send message (primary: UI composer, fallback: API)
// ─────────────────────────────────────────────

export async function sendGathernMessage(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {

  // ── Primary: UI composer injection (most reliable) ──
  if (account.window && !account.window.isDestroyed()) {
    try {
      return await sendGathernMessageViaComposer(account, threadId, message);
    } catch (composerErr) {
      console.warn('[Gathern] Composer send failed:', composerErr instanceof Error ? composerErr.message : composerErr);
    }
  }

  // ── Fallback: direct API calls ──
  const chatToken = account.chatAuthToken || account.authToken;
  if (!chatToken) throw new Error('Chat token not found and window not open — please open Gathern window first');

  // Get unit_id from thread metadata
  const meta = _dbPool
    ? await getGathernThreadMeta(account.id, threadId, _dbPool)
    : { unit_id: null, chalet_id: null };
  const unitId = meta.unit_id ? Number(meta.unit_id) : null;
  const chaletId = meta.chalet_id ? Number(meta.chalet_id) : null;

  if (!unitId) {
    throw new Error(
      'لا يمكن الرد: لم يُعثر على معرّف الوحدة (unit_id) لهذه المحادثة. افتح نافذة جاذر إن ثم حاول مرة أخرى.'
    );
  }

  // Try multiple known endpoints
  const endpoints = [
    'https://chatapi-prod.gathern.co/v1/business/message/send',
    'https://chatapi-prod.gathern.co/v1/business/chats/messages',
  ];

  const payloads = [
    { chat_uid: threadId, message, type: 'text', chat_type: 2, unit_id: Number(unitId), chalet_id: Number(chaletId || unitId), unitId: Number(unitId) },
    { chat_id: threadId, type: 'owner_text', content: message, unit_id: Number(unitId) },
  ];

  for (let i = 0; i < endpoints.length; i++) {
    try {
      const response = await axios.post(endpoints[i], payloads[i], {
        headers: {
          'Authorization': `Bearer ${chatToken}`,
          'Content-Type': 'application/json',
          'User-Agent': UA,
          'Origin': 'https://business.gathern.co',
          'Referer': `https://business.gathern.co/app/chat/${threadId}`,
        },
        timeout: 10000,
      });
      if (response.status === 200 || response.status === 201) {
        console.log(`[Gathern] Send (API endpoint ${i + 1}) success:`, JSON.stringify(response.data).substring(0, 200));
        return true;
      }
    } catch (err: any) {
      console.warn(`[Gathern] API endpoint ${i + 1} failed:`, err.message);
    }
  }

  throw new Error('Failed to send Gathern message: all methods failed. Please open the Gathern chat window and try again.');
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
      message: message.trim(),
      type: 'TEXT',
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
  } catch (uiErr) {
    console.warn('[Airbnb] Composer send failed, trying API fallback:', uiErr instanceof Error ? uiErr.message : uiErr);
  }

  // Fallback 1: bridge API call (if composer path fails)
  try {
    const res = await dispatchFetchViaBridge<{ errors?: Array<{ message: string }> }>(account, url, {
      method: 'POST',
      headers,
      body: payload,
    });
    console.log('[Airbnb] Send (bridge) response:', JSON.stringify(res).substring(0, 200));
    if (res?.errors?.length) {
      throw new Error(res.errors[0]?.message || 'Airbnb API error');
    }
    return true;
  } catch (bridgeErr: unknown) {
    console.warn('[Airbnb] Bridge send failed:', bridgeErr instanceof Error ? bridgeErr.message : String(bridgeErr));
  }

  // Fallback 2: direct net.fetch with cookies (may fail on CSRF/hash rotation)
  const data = await apiCall<{ errors?: Array<{ message: string }> }>(url, cookies, headers, {
    method: 'POST',
    body: payload,
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
  threadId: string,
  message: string
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
