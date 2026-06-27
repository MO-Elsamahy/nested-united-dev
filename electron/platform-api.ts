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

const PROD_APP_URL = "https://go.nestedunited.com";
const getApiUrl = () => app.isPackaged ? PROD_APP_URL : (process.env.DEV_SERVER_URL || "http://localhost:3000");

async function getGathernThreadMeta(
  accountId: string,
  threadId: string
): Promise<GathernThreadMeta> {
  try {
    const res = await net.fetch(`${getApiUrl()}/api/browser-accounts/${accountId}/thread-meta?threadId=${threadId}`);
    if (res.ok) {
      const data = await res.json() as GathernThreadMeta;
      return { unit_id: data.unit_id ? String(data.unit_id) : null, chalet_id: data.chalet_id ? String(data.chalet_id) : null };
    }
  } catch (err) {
    console.warn('[API] getGathernThreadMeta failed:', err);
  }
  return { unit_id: null, chalet_id: null };
}

// ─────────────────────────────────────────────
// GATHERN — Ensure window is on the base chat page (SPA, no direct thread URLs)
// ─────────────────────────────────────────────

async function ensureGathernChatPage(win: BrowserWindow): Promise<void> {
  const currentUrl = win.webContents.getURL() || '';

  // Already on the chat section — skip navigation
  if (currentUrl.includes('business.gathern.co/app/chat')) {
    console.log('[Gathern] ✅ Already on chat page, skipping navigation');
    return;
  }

  console.log('[Gathern] 🔀 Navigating to base chat page...');

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
    win.webContents.loadURL('https://business.gathern.co/app/chat').catch(() => finish());
    setTimeout(finish, 12_000);
  });

  // Poll until the SPA sidebar renders (up to 8s)
  await win.webContents.executeJavaScript(`
    (async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 80; i++) {
        const hasSidebar = !!(document.querySelector('[class*="chat"], [class*="conversation"], [class*="contact"], li, .list-group-item'));
        if (hasSidebar) return true;
        await sleep(100);
      }
      return false;
    })()
  `, true).catch(() => false);

  console.log('[Gathern] ✅ Chat page ready');
}

// ─────────────────────────────────────────────
// GATHERN — Send message via UI composer injection
// ─────────────────────────────────────────────

async function sendGathernMessageViaComposer(
  account: BrowserAccountSession,
  threadId: string,
  message: string,
  guestName?: string
): Promise<boolean> {
  if (!account.window || account.window.isDestroyed()) {
    throw new Error('Gathern window is not open — please open it first');
  }

  // Navigate to the base chat page (Gathern SPA does not support direct /chat/{threadId} URLs)
  await ensureGathernChatPage(account.window);

  // The injected script:
  // 1. Searches for the correct thread in the sidebar and clicks it
  // 2. CRITICAL SAFETY: verifies the URL/DOM confirms we are on that thread before typing
  // 3. Types the message and sends it
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

      // ── Step 1: Find and click the correct thread in the sidebar ──
      // DOM structure (from actual Gathern HTML):
      //   div.gathern-rtl-1jp6cc4   ← outer clickable row
      //     div.gathern-rtl-84yphb  ← inner row container
      //       div.gathern-rtl-1ase0z1
      //         p.gathern-rtl-1d97rig  ← unit name "The Lounge"
      //         p.gathern-rtl-m7rq5m   ← "الضيف / هديل اح.."
      const guestNameToFind = ${JSON.stringify(guestName || '')};

      const findAndClickThread = async () => {
        if (!guestNameToFind) return null;

        // Extract first word of guest name for matching (sidebar truncates names)
        const firstWord = guestNameToFind.trim().split(/\s+/)[0];
        if (!firstWord) return null;

        // Strategy 1: Find <p class*="m7rq5m"> which shows "الضيف / NAME"
        // This is the exact element in Gathern's chat sidebar rows
        const guestParagraphs = Array.from(document.querySelectorAll('p[class*="m7rq5m"]'));
        for (const p of guestParagraphs) {
          const rawText = p.textContent || '';
          // Text format: "الضيف / هديل اح.." — strip prefix and match first word
          const nameAfterSlash = rawText.split('/').pop()?.trim() || rawText;
          if (nameAfterSlash.includes(firstWord) || rawText.includes(firstWord)) {
            // The clickable row is the outer 1jp6cc4 div (or 84yphb as fallback)
            const row = p.closest('[class*="1jp6cc4"]')
                      || p.closest('[class*="84yphb"]')
                      || p.parentElement?.parentElement?.parentElement
                      || p.parentElement;
            if (row && isVisible(row)) {
              (row as HTMLElement).click();
              return 'guest-para-match';
            }
          }
        }

        // Strategy 2: Broader — any <p> whose text after slash contains the name
        const allParas = Array.from(document.querySelectorAll('p'));
        for (const p of allParas) {
          const txt = p.textContent || '';
          if (txt.includes('الضيف') && txt.includes(firstWord) && isVisible(p)) {
            const row = p.closest('[class*="1jp6cc4"]')
                      || p.closest('[class*="84yphb"]')
                      || p.parentElement?.parentElement?.parentElement
                      || p.parentElement;
            if (row && isVisible(row)) {
              (row as HTMLElement).click();
              return 'para-text-match';
            }
          }
        }

        return null;
      };

      // Try up to 5 seconds to find and click the thread
      let clickResult = null;
      for (let attempt = 0; attempt < 50; attempt++) {
        clickResult = await findAndClickThread();
        if (clickResult) break;
        await sleep(100);
      }

      if (!clickResult) {
        // Collect diagnostics
        const allM7 = Array.from(document.querySelectorAll('p[class*="m7rq5m"]')).map(e => e.textContent).slice(0, 10);
        return { ok: false, error: 'gathern_thread_not_found_in_sidebar', guestName: guestNameToFind, availableNames: allM7 };
      }

      // Wait for chat panel to open (the composer to appear)
      await sleep(1000);

      // ── SAFETY: Verify the correct chat opened by checking the header/title ──
      // This prevents sending to the wrong chat if names are similar
      let confirmed = true; // default to true (we clicked, proceed)
      if (guestNameToFind) {
        const nameParts = guestNameToFind.trim().split(/\s+/);
        const firstWord = nameParts[0];
        if (firstWord) {
          const headerText = document.querySelector('[class*="chat-header"], [class*="1ase0z1"], header, [class*="header"]')?.textContent || '';
          confirmed = headerText.includes(firstWord);
        }
      }

      // ── Step 2: Find the composer (poll up to 12s) ──
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
          'input[type="text"]',
        ];
        const candidates = collect(selectors);
        if (candidates.length === 0) return null;
        candidates.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return (br.bottom - ar.bottom) || ((br.width * br.height) - (ar.width * ar.height));
        });
        return candidates[0];
      };

      let composer = null;
      for (let w = 0; w < 120; w++) {
        composer = findComposer();
        if (composer) break;
        await sleep(100);
      }

      if (!composer) {
        const textareas = collect(['textarea']).length;
        const inputs = collect(['input']).length;
        const editables = collect(['[contenteditable="true"]', '[role="textbox"]']).length;
        const buttons = collect(['button']).length;
        return { ok: false, error: 'gathern_composer_not_found_or_button_disabled', debug: { textareas, inputs, editables, buttons, url: location.href, clickResult, confirmed } };
      }

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

      await setComposerValue(composer, msg);
        
      // Wait for React to update the state and enable the send button
      let sendBtn = null;
      for (let j = 0; j < 20; j++) {
        await sleep(50);
        sendBtn = findSendButton();
        if (sendBtn && !sendBtn.disabled && sendBtn.getAttribute('aria-disabled') !== 'true') {
          break;
        }
      }

      if (sendBtn && !sendBtn.disabled) {
        sendBtn.click();
        return { ok: true, via: 'composer-button', threadClicked };
      }

      // Fallback: press Enter key
      composer.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
      composer.dispatchEvent(new KeyboardEvent('keyup',   { key: 'Enter', code: 'Enter', bubbles: true }));
      return { ok: true, via: 'composer-enter', threadClicked };
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
    // Capture page title to diagnose login/redirect issues
    const pageTitle = await account.window.webContents.executeJavaScript('document.title', true).catch(() => '?');
    const pageUrl = account.window.webContents.getURL();
    console.error(`[Gathern] Composer fail — page: "${pageTitle}" url: ${pageUrl}`);
    throw new Error((result?.error || 'Failed to send via Gathern composer') + dbg);
  }
  console.log(`[Gathern] ✅ Message sent via composer (${result.via}, threadClicked=${result.threadClicked})`);
  return true;
}

// ─────────────────────────────────────────────
// GATHERN — Send message (primary: API, fallback: UI composer)
// ─────────────────────────────────────────────
// IMPORTANT: API is used first because it accepts an explicit chat_uid,
// guaranteeing the message goes to the correct thread.
// The UI composer is only a fallback because it types into whatever
// chat is currently open — which may NOT be the intended thread.

// Helper to safely extract a property from an unknown nested object
function extractGathernProp(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  for (const val of Object.values(obj)) {
    const res = extractGathernProp(val, keys);
    if (res !== null) return res;
  }
  return null;
}

export async function sendGathernMessage(
  account: BrowserAccountSession,
  threadId: string,
  message: string
): Promise<boolean> {
  const chatToken = account.chatAuthToken || account.authToken;
  if (!chatToken) {
    throw new Error('فشل إرسال رسالة جاذر إن: لا يوجد توكن مسجل (Chat Token). يرجى فتح الحساب للتحديث.');
  }

  console.log('[Gathern] Loading chat details...');

  // Step 1: Get metadata to retrieve initial unit_id
  const meta = await getGathernThreadMeta(account.id, threadId);
  const initialUnitId = meta.unit_id ? String(meta.unit_id) : null;

  if (!initialUnitId) {
    throw new Error('فشل إرسال رسالة جاذر إن: لم يتم العثور على unit_id في قاعدة البيانات. يرجى فتح المحادثة أولاً.');
  }

  const commonHeaders = {
    'Authorization': `Bearer ${chatToken}`,
    'Content-Type': 'application/json',
    'Origin': 'https://business.gathern.co',
    'Referer': 'https://business.gathern.co/',
  };

  // Step 2: Fetch chat details
  let chatDetails: any;
  try {
    const detailsRes = await axios.post(
      'https://chatapi-prod.gathern.co/api/v2/user_chat/chat_details',
      {
        is_support: "0",
        unit_id: initialUnitId,
        chat_type: "2",
        chat_uid: threadId,
        page: "1"
      },
      {
        headers: commonHeaders,
        timeout: 10000,
      }
    );
    chatDetails = detailsRes.data;
    console.log('[Gathern] Chat details loaded');
  } catch (err: any) {
    throw new Error(`Unable to fetch Gathern chat details: ${err.message}`);
  }

  // Step 3: Extract everything needed from chat_details
  const finalUnitId = extractGathernProp(chatDetails, ['unit_id']) || initialUnitId;
  const finalChaletId = extractGathernProp(chatDetails, ['chalet_id']) || meta.chalet_id || finalUnitId;
  const providerId = extractGathernProp(chatDetails, ['provider_id', 'host_id']);
  const clientId = extractGathernProp(chatDetails, ['client_id', 'user_id', 'guest_id']);

  // Step 4: Build exactly matching payload
  const now = new Date();
  
  // Format local time like "3:37 AM"
  const created_at_time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });

  const payload = {
    chat_uid: threadId,
    provider_id: providerId ? Number(providerId) : undefined,
    sender_id: providerId ? Number(providerId) : undefined,
    message_type: 2,
    unit_id: Number(finalUnitId),
    chat_type: "2",
    client_id: clientId ? Number(clientId) : undefined,
    receiver_id: clientId ? Number(clientId) : undefined,
    chalet_id: finalChaletId ? Number(finalChaletId) : undefined,
    message: message,
    id: Date.now(),
    status: "sending",
    is_suspected: 0,
    is_suspended_msg: false,
    seen: -1,
    created_at: now.toISOString(),
    created_at_time: created_at_time,
    content: message
  };

  // Remove undefined properties to match exactly what is known
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined)
  );

  console.log('[Gathern] Sending message...');

  // Step 5: Send Message
  try {
    const sendRes = await axios.post(
      'https://chatapi-prod.gathern.co/api/v2/user_chat/send_message',
      cleanedPayload,
      {
        headers: commonHeaders,
        timeout: 15000,
      }
    );

    // Step 6: Validate success
    if (sendRes.data && sendRes.data.success === true) {
      console.log('[Gathern] Message sent successfully');
      return true;
    } else {
      console.error('[Gathern] API Error response body:', sendRes.data);
      throw new Error(`API reported success=false. Body: ${JSON.stringify(sendRes.data)}`);
    }
  } catch (err: any) {
    const status = err.response?.status || 'Unknown';
    const body = err.response?.data ? JSON.stringify(err.response.data) : 'No body';
    console.error(`[Gathern] API Error (Status: ${status}): ${err.message}`, body);
    throw new Error(`فشل إرسال رسالة جاذر إن عبر الـ API. Status: ${status}, Error: ${err.message}, Body: ${body}`);
  }
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
