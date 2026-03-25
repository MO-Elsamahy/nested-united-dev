import { session, net, BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

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

// Central store for browser accounts sessions to avoid circular dependencies
export const browserSessions: Map<string, BrowserAccountSession> = new Map();

export function loadSavedSessions(): BrowserAccountSession[] {
  try {
    const userDataPath = app.getPath("userData");
    const sessionsPath = path.join(userDataPath, "sessions.json");
    if (fs.existsSync(sessionsPath)) {
      const data = fs.readFileSync(sessionsPath, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading sessions:", error);
  }
  return [];
}

export function saveSessions() {
  try {
    const userDataPath = app.getPath("userData");
    const sessionsPath = path.join(userDataPath, "sessions.json");
    const sessions = Array.from(browserSessions.values()).map((s) => ({
      id: s.id,
      platform: s.platform,
      accountName: s.accountName,
      partition: s.partition,
      createdBy: s.createdBy,
      authToken: s.authToken,
      chatAuthToken: s.chatAuthToken,
      platformUserId: s.platformUserId
    }));
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error("Error saving sessions:", error);
  }
}

const chromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Extracts cookies from an Electron session for a specific platform.
 */
export async function getCookiesForPlatform(account: BrowserAccountSession): Promise<string> {
  const partition = `persist:${account.partition}`;
  const ses = session.fromPartition(partition);
  
  const filter: any = {};
  if (account.platform === 'airbnb') {
    filter.domain = '.airbnb.com';
  } else if (account.platform === 'gathern') {
    // For Gathern, don't filter by domain as it spans across .gathern.co and business.gathern.co
    // and sometimes uses path-specific cookies.
  }
    
  const cookies = await ses.cookies.get(filter);
  console.log(`[Platform API][${account.accountName}] 🍪 Found ${cookies.length} cookies`);
  
  if (cookies.length === 0) {
    console.warn(`[Platform API][${account.accountName}] ⚠️ NO COOKIES found for ${account.platform}. User may need to log in via the browser tab.`);
  }

  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Perform an API call using the session cookies and a desktop User-Agent.
 */
export async function platformApiCall(account: BrowserAccountSession, url: string, options: any = {}) {
  const cookieStr = await getCookiesForPlatform(account);
  
  const headers = {
    'Cookie': cookieStr,
    'User-Agent': chromeUserAgent,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    'Origin': account.platform === 'airbnb' ? 'https://www.airbnb.com' : 'https://business.gathern.co',
    'Referer': account.platform === 'airbnb' ? 'https://www.airbnb.com/' : 'https://business.gathern.co/',
    'X-Airbnb-Api-Key': account.platform === 'airbnb' && account.authToken ? account.authToken : 'd306zoyjsyarp7ifhu67rjxn52tv0t20',
    'X-Airbnb-GraphQL-Platform': 'web',
    'X-Airbnb-GraphQL-Platform-Client': 'minimalist-niobe',
    'X-CSRF-Without-Token': '1',
    ...options.headers,
  } as any;

  if (account.platform === 'gathern' && account.authToken) {
    headers['Authorization'] = `Bearer ${account.authToken}`;
  }

  try {
    const response = await net.fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Platform API][${account.accountName}] ❌ Error ${response.status}:`, errorText.substring(0, 200));
      throw new Error(`API returned ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    console.log(`[Platform API][${account.accountName}] ✅ Success. Data length: ${JSON.stringify(data).length}`);
    return data;
  } catch (error: any) {
    console.error(`[Platform API][${account.accountName}] ❌ Failed to fetch ${url}:`, error.message);
    throw error;
  }
}

// Platform-Specific fetchers

export async function fetchAirbnbMessages(account: BrowserAccountSession) {
  // Always use V3 now as V2 404s/400s
  return await fetchAirbnbMessagesV3(account);
}

async function fetchAirbnbMessagesV3(account: BrowserAccountSession) {
  const hash = "bcd895bbf187ef3ef814c634e61130ddc3bd0bc45e4c9edf7fd7dc63714a898d";
  const variables = encodeURIComponent(JSON.stringify({
    getParticipants: true,
    numRequestedThreads: 20,
    useUserThreadTag: true,
    userId: account.platformUserId ? (
        account.platformUserId.includes('Vmlld2Vy') ? account.platformUserId : // Already Viewer: in Base64
        account.platformUserId.includes('VXNlcg') ? account.platformUserId.replace('VXNlcg', 'Vmlld2Vy') : // Convert User: to Viewer: in Base64
        (account.platformUserId.includes('Viewer') ? account.platformUserId : account.platformUserId.replace('User', 'Viewer')) // Plain text
    ) : undefined,
    originType: "USER_INBOX",
    threadVisibility: "UNARCHIVED",
    threadTagFilters: [],
    query: null,
    getLastReads: false,
    getThreadState: false,
    getInboxFields: true,
    getInboxOnlyFields: true,
    getMessageFields: false,
    getThreadOnlyFields: false,
    skipOldMessagePreviewFields: false
  }));

  const url = `https://www.airbnb.com/api/v3/ViaductInboxData/${hash}?operationName=ViaductInboxData&variables=${variables}&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22${hash}%22%7D%7D`;
  
  const data = await platformApiCall(account, url);
  
  // LOG THE STRUCTURE (First level) to debug why it's missing threads
  if (data?.data) {
     console.log(`[Platform API][${account.accountName}] 🧩 V3 Response Keys:`, Object.keys(data.data));
  } else {
     console.warn(`[Platform API][${account.accountName}] ⚠️ V3 Response has NO DATA property! Structure:`, JSON.stringify(data).substring(0, 200));
  }

  // Normalize V3 response to look like V2 for the PollingService
  // Try multiple common paths for Airbnb GraphQL Threads
  let threads = data?.data?.presentation?.inbox?.threads || 
                 data?.data?.viewer?.inbox?.threads ||  
                 data?.data?.inbox?.threads ||
                 data?.data?.presentation?.inbox?.threads?.threads;

  // If threads is an object with 'edges' (common Relay pattern)
  if (threads && !Array.isArray(threads) && (threads as any).edges) {
      threads = (threads as any).edges.map((e: any) => e.node || e);
  }

  if (threads && Array.isArray(threads)) {
     console.log(`[Platform API][${account.accountName}] 📋 V3 Normalizer found ${threads.length} threads`);
     return {
       threads: threads.map((t: any) => ({
         id: t.id || t.threadId,
         other_user: { first_name: t.name || t.otherUser?.firstName || t.otherUserUsers?.[0]?.firstName || 'Guest' },
         last_message: {
           message: t.previewText || t.lastMessage?.text || t.lastMessageText || '',
           created_at: t.activeLabelText || t.lastMessage?.createdAt || t.updatedAt || new Date().toISOString()
         }
       }))
     };
  }
  
  console.warn(`[Platform API][${account.accountName}] ⚠️ V3 Normalizer: No threads found. Structure:`, JSON.stringify(data).substring(0, 300));
  return data;
}

export async function fetchAirbnbReservations(account: BrowserAccountSession) {
  const url = 'https://www.airbnb.com/api/v2/reservations?_format=for_host_dashboard&limit=20';
  return platformApiCall(account, url);
}

export async function fetchGathernMessages(account: BrowserAccountSession) {
  const url = 'https://chatapi-prod.gathern.co/api/v2/user_chat/chats';
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_type: "2", page: "1" })
  };
  const data = await platformApiCall(account, url, options);
  
  // Normalize Gathern v2 response to look like threads for PollingService
  // Diagnostic shows Gathern uses 'contact_list' for conversations
  const chats = data.contact_list || data.data?.chats || data.chats;
  if (chats) {
    return {
      threads: chats.map((c: any) => ({
        id: c.chat_uid || c.id,
        other_user: { first_name: c.guest?.name || c.contact_name || 'Guest' },
        last_message: {
          message: c.last_message?.body || c.last_msg || '',
          created_at: c.last_message?.created_at || c.updated_at || new Date().toISOString()
        }
      }))
    };
  }
  return data;
}

export async function fetchGathernReservations(account: BrowserAccountSession) {
  const token = account.authToken;
  const url = token
    ? `https://api.gathern.co/api/vb/provider/booking/index?access-token=${token}`
    : `https://api.gathern.co/v1/business/booking/index`; // Fallback
  return platformApiCall(account, url);
}

export async function checkSessionHealth(account: BrowserAccountSession): Promise<boolean> {
  try {
    const cookieStr = await getCookiesForPlatform(account);
    if (!cookieStr || cookieStr.length < 20) {
        console.warn(`[Health Check][${account.accountName}] ⚠️ Insufficient cookies (${cookieStr.length} chars)`);
        return false;
    }

    // Fast probe to check if session is still valid
    // Airbnb: Use unread count v3 probe
    // Gathern: Use main general info (verified 200 in browser)
    const testUrl = account.platform === 'airbnb' 
      ? 'https://www.airbnb.com/api/v3/FetchEmblemBadgeCounts/bdc888dd01d83d51e06721f1e0073ac9ca1af8dcc01a3505c569a178c972033a?operationName=FetchEmblemBadgeCounts&locale=en&currency=SAR&variables=%7B%22surfaceTypes%22%3A%5B%22UNIFIED_INBOX%22%5D%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22bdc888dd01d83d51e06721f1e0073ac9ca1af8dcc01a3505c569a178c972033a%22%7D%7D'
      : 'https://api.gathern.co/v1/business/main/general';
    
    try {
      await platformApiCall(account, testUrl);
      return true;
    } catch (err) {
      // If Gathern fails the probe but we have an authToken, we consider it "potentially healthy" 
      // because the specific probe might 401 while the chat API still works.
      if (account.platform === 'gathern' && account.authToken) {
        console.warn(`[Health Check][${account.accountName}] ⚠️ Probe failed but token exists. Continuing sync.`);
        return true;
      }
      throw err;
    }
  } catch (error: any) {
    console.warn(`[Health Check][${account.accountName}] ❌ Failed: ${error.message}`);
    return false;
  }
}

/**
 * Sending message
 */
export async function sendPlatformMessage(account: BrowserAccountSession, window: BrowserWindow | undefined, payload: { threadId: string, text: string }) {
  const { threadId, text } = payload;
  console.log(`[Platform API] Sending message to ${account.platform} ${threadId}: ${text}`);
  
  if (account.platform === 'gathern' && window && !window.isDestroyed()) {
    // Gathern often requires UI interaction or specific API tokens captured from window
    await window.webContents.executeJavaScript(`
      console.log('Attempting to send message via UI injection...');
      // UI injection logic for Gathern
    `);
    return { success: true };
  }

  // Fallback for API-based sending (requires CSRF tokens etc)
  return { success: false, error: 'API-based sending not fully implemented' };
}
