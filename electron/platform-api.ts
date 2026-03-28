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

// ─────────────────────────────────────────────
// Persistence
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
// Cookie Management
// ─────────────────────────────────────────────

const AIRBNB_COOKIE_DOMAINS = ['.airbnb.com', 'www.airbnb.com', 'airbnb.com'];
const GATHERN_COOKIE_DOMAINS = ['.gathern.co', 'gathern.co', 'business.gathern.co', 'api.gathern.co', 'chatapi-prod.gathern.co'];

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
// Internal HTTP helper
// ─────────────────────────────────────────────

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function apiCall(url: string, cookieStr: string, extraHeaders: Record<string, string> = {}, options: { method?: string; body?: string; partition?: string } = {}): Promise<any> {
  const currentSession = options.partition ? session.fromPartition(options.partition) : null;
  
  if (options.partition) {
    console.log(`[Platform API] 🌐 Fetching via partition: ${options.partition}`);
  }

  const fetchOptions: any = {
    method: options.method || 'GET',
    headers: {
      'Cookie': cookieStr,
      'User-Agent': UA,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      ...extraHeaders,
    },
    body: options.body,
  };

  const response = await (currentSession ? currentSession.fetch(url, fetchOptions) : net.fetch(url, fetchOptions));

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${err.substring(0, 120)}`);
  }
  return response.json();
}

// ─────────────────────────────────────────────
// AIRBNB
// ─────────────────────────────────────────────

const AIRBNB_INBOX_HASH = '797c9064d50ed14f548c15d60fe481c80c38ae2d392ab7e9192ba2c23acf85c3';
const AIRBNB_API_KEY = 'd306zoyjsyarp7ifhu67rjxn52tv0t20';

export async function fetchAirbnbMessages(account: BrowserAccountSession): Promise<{ threads: any[] } | null> {
  const cookies = await getCookiesForAccount(account);
  if (!cookies) return null;

  const vars = encodeURIComponent(JSON.stringify({
    getParticipants: true,
    numRequestedThreads: 20,
    useUserThreadTag: true,
    originType: 'USER_INBOX',
    threadVisibility: 'UNARCHIVED',
    getLastReads: false,
    getThreadState: false,
    getInboxFields: true,
    getInboxOnlyFields: true,
    getMessageFields: false,
    getThreadOnlyFields: false,
    skipOldMessagePreviewFields: false,
  }));

  const exts = encodeURIComponent(JSON.stringify({
    persistedQuery: { version: 1, sha256Hash: AIRBNB_INBOX_HASH },
  }));

  const url = `https://www.airbnb.com/api/v3/ViaductInboxData/${AIRBNB_INBOX_HASH}?operationName=ViaductInboxData&variables=${vars}&extensions=${exts}`;

  const data = await apiCall(url, cookies, {
    'Origin': 'https://www.airbnb.com',
    'Referer': 'https://www.airbnb.com/hosting/messages',
    'x-airbnb-api-key': AIRBNB_API_KEY,
    'x-airbnb-graphql-platform': 'web',
    'x-airbnb-graphql-platform-client': 'minimalist-niobe',
    'x-csrf-without-token': '1',
    'content-type': 'application/json',
  }).catch(() => null);

  if (!data) return { threads: [] };

  let threads = data?.data?.presentation?.inbox?.threads?.threads || data?.data?.presentation?.inbox?.threads || [];
  if (threads && !Array.isArray(threads) && (threads as any).edges) {
    threads = (threads as any).edges.map((e: any) => e.node || e);
  }

  if (!Array.isArray(threads)) return { threads: [] };

  return {
    threads: threads.map((t: any) => {
      const lastMsg = t.lastMessage || t.message || {};
      const senderId = String(lastMsg.senderId || lastMsg.sender_id || '');
      const text = t.previewText || lastMsg.text || '';
      const time = t.updatedAt || lastMsg.createdAt || '';
      
      const stableId = lastMsg.id || lastMsg.messageId || `stable-airbnb-${t.id}-${time}`;

      return {
        id: String(t.id || t.threadId || ''),
        platform_msg_id: String(stableId),
        guest_name: t.name || t.otherUser?.firstName || 'Guest',
        last_message: text,
        sent_at: time || new Date().toISOString(),
        is_from_me: lastMsg.role === 'HOST' || (account.platformUserId && senderId === account.platformUserId),
        raw: t,
      };
    }),
  };
}

// ─────────────────────────────────────────────
// GATHERN
// ─────────────────────────────────────────────

export async function fetchGathernMessages(account: BrowserAccountSession): Promise<{ threads: any[] } | null> {
  const cookies = await getCookiesForAccount(account);
  if (!cookies) return null;

  const chatToken = account.chatAuthToken || account.authToken;
  if (!chatToken) return { threads: [] };

  let myUid: string | null = account.platformUserId || null;
  if (!myUid && chatToken.includes('|')) myUid = chatToken.split('|')[0];

  const chatsData = await apiCall(
    'https://chatapi-prod.gathern.co/api/v2/user_chat/chats',
    cookies,
    { 'Authorization': `Bearer ${chatToken}`, 'Content-Type': 'application/json' },
    { method: 'POST', body: JSON.stringify({ chat_type: '2', page: '1' }), partition: account.partition }
  ).catch(() => ({}));

  const chats: any[] = chatsData?.contact_list || chatsData?.data?.chats || [];
  
  return {
    threads: chats.map((c: any) => {
      const lastMsg = c.last_message || {};
      const senderId = String(lastMsg.sender_id || '');
      const text = lastMsg.message || lastMsg.body || '';
      
      // Gathern uses created_at (Unix seconds)
      const time = lastMsg.created_at || c.updated_at || '0';
      
      // STRICTLY STABLE ID: Round time to avoid tiny drifts
      const stableTime = Math.floor(Number(time));
      const stableId = lastMsg.id || lastMsg.message_id || `s-g1-${c.chat_uid}-${senderId}-${stableTime}-${text.trim().substring(0, 40)}`;

      return {
        id: String(c.chat_uid || c.id || ''),
        platform_msg_id: String(stableId),
        guest_name: c.name || c.name_verified || 'Guest',
        last_message: text,
        sent_at: lastMsg.created_at ? new Date(lastMsg.created_at * 1000).toISOString() : new Date().toISOString(),
        // Check both myUid from token AND provider_id from chat object
        is_from_me: (myUid && senderId === myUid) || (c.provider_id && senderId === String(c.provider_id)),
        raw: c,
      };
    }),
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

export async function checkSessionHealth(account: BrowserAccountSession): Promise<boolean> {
  try {
    const cookies = await getCookiesForAccount(account);
    if (!cookies || cookies.length < 10) return false;
    if (account.platform === 'airbnb') return cookies.includes('_airbed_session_id') || cookies.includes('bev');
    if (account.platform === 'gathern') return cookies.includes('__QV1xD') || cookies.includes('cf_clearance');
    return true;
  } catch { return false; }
}

async function dispatchFetchViaBridge(account: BrowserAccountSession, url: string, options: any): Promise<any> {
  if (!account.window) throw new Error("Window not available for this session");

  const requestId = Math.random().toString(36).substring(7);
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      (app as any).removeListener('bridge-fetch-response', handler);
      reject(new Error("Webview bridge request timed out (15s)"));
    }, 15000);

    const handler = (response: any) => {
      if (response.requestId === requestId) {
        clearTimeout(timeout);
        (app as any).removeListener('bridge-fetch-response', handler);
        if (response.success) resolve(response.data);
        else reject(new Error(response.error || "Webview bridge fetch failed"));
      }
    };

    (app as any).on('bridge-fetch-response', handler);

    console.log(`[Platform API] Dispatching fetch via bridge [${requestId}]: ${url}`);
    if (account.window) {
      account.window.webContents.send('exec-fetch', { url, options, requestId });
    }
  });
}

export async function sendPlatformMessage(accountId: string, threadId: string, message: string): Promise<any> {
  const account = browserSessions.get(accountId);
  if (!account) throw new Error("Account not found");

  try {
    if (account.platform === 'gathern') {
      const chatToken = account.chatAuthToken || account.authToken;
      if (!chatToken) throw new Error("Chat token not found");

      const url = 'https://chatapi-prod.gathern.co/v1/business/message/send';
      
      const payload = {
        chat_uid: threadId,
        message: message,
        type: 'text',
        chat_type: 2,
        unit_id: 157362,
        chalet_id: 157362,
        unitId: 157362
      };

      const fetchOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chatToken}`,
          'Content-Type': 'application/json',
          'Origin': 'https://business.gathern.co',
          'Referer': `https://business.gathern.co/app/chat/${threadId}`,
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
        },
        body: JSON.stringify(payload)
      };

      let res;
      if (account.window) {
        res = await dispatchFetchViaBridge(account, url, fetchOptions);
      } else {
        res = await apiCall(url, '', {}, { 
          method: 'POST', 
          body: JSON.stringify(payload),
          partition: account.partition 
        });
      }
      
      console.log('[Gathern] Success Response:', res);
      return true;
    }
    throw new Error(`Platform ${account.platform} not supported for replies yet`);
  } catch (e: any) {
    console.error(`[Gathern] Error:`, e.message);
    throw new Error(`Error from Gathern: ${e.message}`);
  }
}
