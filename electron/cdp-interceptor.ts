import type { WebContents } from 'electron';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// CDP (Chrome DevTools Protocol) Network Interceptor
//
// Attaches to a WebContents via webContents.debugger and listens to the
// Network.* domain. Whenever a response body matching one of the URL patterns
// finishes loading we fetch its body via Network.getResponseBody, parse it as
// JSON, and forward it to the handler.
//
// This is the canonical "listen like DevTools" approach:
//   - Sees every request regardless of fetch / XHR / WebSocket / service worker
//   - Returns the exact decompressed body the page received
//   - Needs no forged headers / cookies / CSRF tokens
//   - Completely immune to contextIsolation, CSP, SPA framework choice, etc.
//
// Trade-off: only one CDP client can attach at a time, so Chromium DevTools
// cannot be open at the same time. The caller should detach on
// `devtools-opened` and re-attach on `devtools-closed`.
// ─────────────────────────────────────────────────────────────────────────────

interface ResponseReceivedParams {
  requestId: string;
  response: {
    url: string;
  };
}

interface LoadingFinishedParams {
  requestId: string;
}

interface NetworkResponseBody {
  body: string;
  base64Encoded: boolean;
}

export type CdpSnapshotHandler = (url: string, json: unknown) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Outgoing message emitter (legacy — kept for back-compat)
// ─────────────────────────────────────────────────────────────────────────────
export const outgoingMessageEmitter = new EventEmitter();

export interface OutgoingMessageEvent {
  browserAccountId: string;
  threadId: string;
  platform: 'airbnb' | 'gathern';
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Message Event — Normalized, transport-agnostic event envelope
//
// Emitted by liveMessageEmitter for BOTH incoming and outgoing messages
// detected from HTTP responses.
//
// Sources (transport labels):
//   'cdp-http-incoming' — SyncProtocolSubscription / ViaductGetThreadAndDataQuery
//   'cdp-http-outgoing' — CreateBulkMessagesMutation / CreateInstantEventViaductMutation
//   'cdp-http-gathern'  — Gathern chat API responses
// ─────────────────────────────────────────────────────────────────────────────
export interface LiveMessageEvent {
  // Identity
  platform: 'airbnb' | 'gathern';
  browserAccountId: string;

  // Thread
  threadId: string;
  guestName: string;

  // Message
  platformMsgId: string | null;
  direction: 'incoming' | 'outgoing';
  messageText: string;
  sentAt: string;             // ISO 8601 string
  preview: string;            // truncated text for inbox snippet

  // Metadata
  source: 'cdp-http-incoming' | 'cdp-http-outgoing' | 'cdp-http-gathern';
}

// Single emitter used by main.ts to attach the pipeline
export const liveMessageEmitter = new EventEmitter();

// ─────────────────────────────────────────────────────────────────────────────
// URL pattern lists
// ─────────────────────────────────────────────────────────────────────────────

// URLs we care about. Each regex is tested against the full response URL.
const URL_PATTERNS: RegExp[] = [
  /\/api\/v3\/ViaductInboxData\//,
  /\/api\/v3\/ViaductGetThreadAndDataQuery\//,
  /\/api\/v3\/SyncProtocolSubscription\//,
  /\/api\/v3\/CreateBulkMessagesMutation\//,
  /\/api\/v3\/CreateInstantEventViaductMutation\//,
  /chatapi-prod\.gathern\.co/,
  /business\.gathern\.co\/api\/v2\/user_chat/,
];

function matchesAny(url: string): boolean {
  for (const r of URL_PATTERNS) if (r.test(url)) return true;
  return false;
}

// Airbnb outgoing mutation names
const AIRBNB_OUTGOING_MUTATIONS = [
  'CreateBulkMessagesMutation',
  'CreateInstantEventViaductMutation',
] as const;

// Gathern outgoing POST URLs
const GATHERN_OUTGOING_URL_PATTERNS: RegExp[] = [
  /chatapi-prod\.gathern\.co\/api\/v2\/user_chat\/send_message/,
  /chatapi-prod\.gathern\.co\/api\/v2\/user_chat\/chat_details\/send/,
  /api\.gathern\.co\/v1\/business\/chat\/messages/,
];

// ─────────────────────────────────────────────────────────────────────────────
// Parsers — extract normalized fields from raw API responses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract threadId from an Airbnb outgoing mutation response.
 */
function extractAirbnbThreadId(json: unknown, postData?: string): string | null {
  try {
    const data = (json as any)?.data;
    if (data) {
      const cbm = data.createBulkMessages?.thread?.id
        ?? data.createBulkMessages?.thread?.threadId;
      if (cbm) return String(cbm);

      const cie = data.createInstantEventViaduct?.thread?.id
        ?? data.createInstantEventViaduct?.thread?.threadId;
      if (cie) return String(cie);

      for (const val of Object.values(data)) {
        const v = val as any;
        if (v?.thread?.id) return String(v.thread.id);
        if (v?.thread?.threadId) return String(v.thread.threadId);
      }
    }
  } catch { /* ignore */ }

  // Fallback to request postData
  if (postData) {
    try {
      const reqJson = JSON.parse(postData);
      const variables = reqJson?.variables;
      if (variables) {
        const tid = variables.threadId || variables.messageThreadId || variables.id;
        if (tid) return String(tid);
      }
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Extract threadId from a Gathern send-message API response.
 */
function extractGathernThreadId(json: unknown, postData?: string): string | null {
  try {
    const j = json as any;
    let tid = String(
      j?.chat_uid
      ?? j?.data?.chat_uid
      ?? j?.data?.chat?.chat_uid
      ?? j?.data?.id
      ?? ''
    ) || null;
    
    if (tid) return tid;
  } catch { /* ignore */ }

  // Fallback to request postData
  if (postData) {
    try {
      // Gathern might send it as JSON or FormData/URL-encoded
      const reqJson = JSON.parse(postData);
      const tid = reqJson?.chat_uid || reqJson?.thread_id || reqJson?.chatId;
      if (tid) return String(tid);
    } catch {
      // If it's URL-encoded (e.g. chat_uid=123&message=hi)
      try {
        const params = new URLSearchParams(postData);
        const tid = params.get('chat_uid') || params.get('thread_id');
        if (tid) return String(tid);
      } catch { /* ignore */ }
    }
  }

  return null;
}

function makePreview(text: string | null | undefined, max = 80): string {
  if (!text) return '';
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ─────────────────────────────────────────────────────────────────────────────
// Airbnb SyncProtocolSubscription parser
//
// Airbnb pushes real-time thread deltas through SyncProtocolSubscription
// (repeated HTTP POSTs, ~every few seconds). The response contains an array
// of delta objects, each of which may carry new messages.
//
// Typical shape (simplified):
//   { data: { syncProtocol: { deltas: [ { messageThread: { ... } } ] } } }
// ─────────────────────────────────────────────────────────────────────────────
function parseSyncProtocolSubscription(
  json: unknown,
  browserAccountId: string
): LiveMessageEvent[] {
  const events: LiveMessageEvent[] = [];
  try {
    const j = json as any;
    const deltas: any[] =
      j?.data?.syncProtocol?.deltas
      ?? j?.data?.syncProtocol?.data?.deltas
      ?? j?.deltas
      ?? [];

    for (const delta of deltas) {
      // Thread delta
      const thread = delta?.messageThread ?? delta?.thread;
      if (!thread) continue;

      const rawId = thread.id ?? thread.threadId;
      if (!rawId) continue;

      // Decode base64 "MessageThread:NNNN" → "NNNN"
      let threadId = String(rawId);
      try {
        const decoded = Buffer.from(threadId, 'base64').toString('utf8');
        if (decoded.startsWith('MessageThread:')) {
          threadId = decoded.split(':')[1];
        }
      } catch { /* keep original */ }

      // Guest name
      const participants: any[] = thread.participants ?? thread.secondaryParticipants ?? [];
      const guest = participants.find((p: any) => !p.isHost && !p.isYou) ?? participants[0];
      const guestName = guest?.firstName ?? guest?.displayName ?? 'Guest';

      // Messages
      const messages: any[] = thread.messages ?? thread.messageList ?? [];
      for (const msg of messages) {
        const msgText = msg?.body?.htmlText ?? msg?.message ?? msg?.body ?? '';
        if (!msgText) continue;

        const isFromMe = msg?.isFromHost ?? msg?.isMine ?? false;
        const rawTimestamp = msg?.createdAt ?? msg?.sentAt ?? msg?.timestamp;
        const sentAt = rawTimestamp
          ? new Date(typeof rawTimestamp === 'number' ? rawTimestamp * 1000 : rawTimestamp).toISOString()
          : new Date().toISOString();

        events.push({
          platform: 'airbnb',
          browserAccountId,
          threadId,
          guestName,
          platformMsgId: msg?.id ? String(msg.id) : null,
          direction: isFromMe ? 'outgoing' : 'incoming',
          messageText: msgText,
          sentAt,
          preview: makePreview(msgText),
          source: 'cdp-http-incoming',
        });
      }

      // If no messages array but thread itself has a last message
      if (messages.length === 0) {
        const lastMsg = thread.lastMessage ?? thread.latestMessage;
        if (lastMsg?.body?.htmlText || lastMsg?.message) {
          const msgText = lastMsg?.body?.htmlText ?? lastMsg?.message ?? '';
          const isFromMe = lastMsg?.isFromHost ?? lastMsg?.isMine ?? false;
          const rawTimestamp = lastMsg?.createdAt ?? lastMsg?.sentAt;
          const sentAt = rawTimestamp
            ? new Date(typeof rawTimestamp === 'number' ? rawTimestamp * 1000 : rawTimestamp).toISOString()
            : new Date().toISOString();

          events.push({
            platform: 'airbnb',
            browserAccountId,
            threadId,
            guestName,
            platformMsgId: lastMsg?.id ? String(lastMsg.id) : null,
            direction: isFromMe ? 'outgoing' : 'incoming',
            messageText: msgText,
            sentAt,
            preview: makePreview(msgText),
            source: 'cdp-http-incoming',
          });
        }
      }
    }
  } catch { /* ignore */ }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Airbnb ViaductInboxData parser
//
// Returns the full inbox thread list. We emit a "thread-level" ping for
// each thread so the UI can update its inbox row without needing a message.
// ─────────────────────────────────────────────────────────────────────────────
function parseViaductInboxData(
  json: unknown,
  browserAccountId: string
): LiveMessageEvent[] {
  const events: LiveMessageEvent[] = [];
  try {
    const j = json as any;
    const threads: any[] =
      j?.data?.presentation?.messageThreads?.threads
      ?? j?.data?.messageThreads?.threads
      ?? j?.data?.threads
      ?? [];

    for (const thread of threads) {
      const rawId = thread?.id ?? thread?.threadId;
      if (!rawId) continue;

      let threadId = String(rawId);
      try {
        const decoded = Buffer.from(threadId, 'base64').toString('utf8');
        if (decoded.startsWith('MessageThread:')) threadId = decoded.split(':')[1];
      } catch { /* keep */ }

      const lastMsg = thread?.lastMessage ?? thread?.latestMessage;
      if (!lastMsg) continue;

      const msgText = lastMsg?.body?.htmlText ?? lastMsg?.message ?? '';
      if (!msgText) continue;

      const participants: any[] = thread.participants ?? thread.secondaryParticipants ?? [];
      const guest = participants.find((p: any) => !p.isHost && !p.isYou) ?? participants[0];
      const guestName = guest?.firstName ?? guest?.displayName ?? 'Guest';

      const isFromMe = lastMsg?.isFromHost ?? lastMsg?.isMine ?? false;
      const rawTimestamp = lastMsg?.createdAt ?? lastMsg?.sentAt;
      const sentAt = rawTimestamp
        ? new Date(typeof rawTimestamp === 'number' ? rawTimestamp * 1000 : rawTimestamp).toISOString()
        : new Date().toISOString();

      events.push({
        platform: 'airbnb',
        browserAccountId,
        threadId,
        guestName,
        platformMsgId: lastMsg?.id ? String(lastMsg.id) : null,
        direction: isFromMe ? 'outgoing' : 'incoming',
        messageText: msgText,
        sentAt,
        preview: makePreview(msgText),
        source: 'cdp-http-incoming',
      });
    }
  } catch { /* ignore */ }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Airbnb ViaductGetThreadAndDataQuery parser
// ─────────────────────────────────────────────────────────────────────────────
function parseViaductGetThread(
  json: unknown,
  browserAccountId: string
): LiveMessageEvent[] {
  const events: LiveMessageEvent[] = [];
  try {
    const j = json as any;
    const thread =
      j?.data?.presentation?.thread
      ?? j?.data?.threadData
      ?? j;

    const rawId = thread?.id ?? thread?.threadId;
    if (!rawId) return events;

    let threadId = String(rawId);
    try {
      const decoded = Buffer.from(threadId, 'base64').toString('utf8');
      if (decoded.startsWith('MessageThread:')) threadId = decoded.split(':')[1];
    } catch { /* keep */ }

    const participants: any[] = thread.participants ?? thread.secondaryParticipants ?? [];
    const guest = participants.find((p: any) => !p.isHost && !p.isYou) ?? participants[0];
    const guestName = guest?.firstName ?? guest?.displayName ?? 'Guest';

    const messages: any[] = thread.messages ?? thread.messageList ?? [];
    for (const msg of messages) {
      const msgText = msg?.body?.htmlText ?? msg?.message ?? msg?.body ?? '';
      if (!msgText) continue;
      const isFromMe = msg?.isFromHost ?? msg?.isMine ?? false;
      const rawTimestamp = msg?.createdAt ?? msg?.sentAt ?? msg?.timestamp;
      const sentAt = rawTimestamp
        ? new Date(typeof rawTimestamp === 'number' ? rawTimestamp * 1000 : rawTimestamp).toISOString()
        : new Date().toISOString();

      events.push({
        platform: 'airbnb',
        browserAccountId,
        threadId,
        guestName,
        platformMsgId: msg?.id ? String(msg.id) : null,
        direction: isFromMe ? 'outgoing' : 'incoming',
        messageText: msgText,
        sentAt,
        preview: makePreview(msgText),
        source: 'cdp-http-incoming',
      });
    }
  } catch { /* ignore */ }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gathern incoming message parser
// ─────────────────────────────────────────────────────────────────────────────
function parseGathernIncoming(
  url: string,
  json: unknown,
  browserAccountId: string
): LiveMessageEvent[] {
  const events: LiveMessageEvent[] = [];
  try {
    const j = json as any;

    // Gathern chat list / inbox
    const chats: any[] = j?.data?.chats ?? j?.data ?? (Array.isArray(j) ? j : []);
    for (const chat of chats) {
      const threadId = String(chat?.chat_uid ?? chat?.uid ?? chat?.id ?? '');
      if (!threadId) continue;
      const guestName = chat?.user?.name ?? chat?.guest_name ?? 'Guest';
      const lastMsg = chat?.last_message ?? chat?.lastMessage;
      if (!lastMsg) continue;
      const msgText = lastMsg?.body ?? lastMsg?.message ?? lastMsg?.text ?? '';
      if (!msgText) continue;
      const isFromMe = lastMsg?.is_from_me ?? lastMsg?.isMine ?? false;
      const rawTimestamp = lastMsg?.sent_at ?? lastMsg?.created_at ?? lastMsg?.sentAt;
      const sentAt = rawTimestamp
        ? new Date(rawTimestamp).toISOString()
        : new Date().toISOString();
      events.push({
        platform: 'gathern',
        browserAccountId,
        threadId,
        guestName,
        platformMsgId: lastMsg?.id ? String(lastMsg.id) : null,
        direction: isFromMe ? 'outgoing' : 'incoming',
        messageText: msgText,
        sentAt,
        preview: makePreview(msgText),
        source: 'cdp-http-gathern',
      });
    }

    // Single chat / thread details
    if (events.length === 0) {
      const threadId = String(j?.chat_uid ?? j?.data?.chat_uid ?? j?.data?.chat?.uid ?? '');
      if (threadId) {
        const msgs: any[] = j?.data?.messages ?? j?.messages ?? [];
        const guestName = j?.data?.user?.name ?? j?.data?.guest_name ?? 'Guest';
        for (const msg of msgs) {
          const msgText = msg?.body ?? msg?.message ?? msg?.text ?? '';
          if (!msgText) continue;
          const isFromMe = msg?.is_from_me ?? msg?.isMine ?? false;
          const rawTimestamp = msg?.sent_at ?? msg?.created_at ?? msg?.sentAt;
          const sentAt = rawTimestamp ? new Date(rawTimestamp).toISOString() : new Date().toISOString();
          events.push({
            platform: 'gathern',
            browserAccountId,
            threadId,
            guestName,
            platformMsgId: msg?.id ? String(msg.id) : null,
            direction: isFromMe ? 'outgoing' : 'incoming',
            messageText: msgText,
            sentAt,
            preview: makePreview(msgText),
            source: 'cdp-http-gathern',
          });
        }
      }
    }
  } catch { /* ignore */ }
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Master dispatcher — routes a parsed JSON response to the correct parser
// Returns an array of normalized LiveMessageEvents (may be empty)
// ─────────────────────────────────────────────────────────────────────────────
function extractLiveEvents(
  url: string,
  json: unknown,
  browserAccountId: string
): LiveMessageEvent[] {
  if (url.includes('SyncProtocolSubscription')) {
    return parseSyncProtocolSubscription(json, browserAccountId);
  }
  if (url.includes('ViaductInboxData')) {
    return parseViaductInboxData(json, browserAccountId);
  }
  if (url.includes('ViaductGetThreadAndDataQuery')) {
    return parseViaductGetThread(json, browserAccountId);
  }
  if (url.includes('chatapi-prod.gathern') || url.includes('business.gathern.co/api/v2/user_chat')) {
    return parseGathernIncoming(url, json, browserAccountId);
  }
  return [];
}

export interface CdpInterceptorHandle {
  detach: () => void;
  isAttached: () => boolean;
}

/**
 * Attach a CDP network interceptor to a WebContents.
 *
 * Safe to call multiple times for the same WebContents: if a debugger is
 * already attached, the returned handle is a no-op and `isAttached()` is
 * false.
 */
export function attachCdpInterceptor(
  wc: WebContents,
  handler: CdpSnapshotHandler,
  opts: { label?: string; browserAccountId?: string } = {}
): CdpInterceptorHandle {
  const label = opts.label || 'cdp';
  const browserAccountId = opts.browserAccountId || label;

  try {
    wc.debugger.attach('1.3');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Already attached (usually by DevTools) — caller can retry later.
    if (!msg.includes('already attached')) {
      console.warn(`[CDP][${label}] attach failed:`, msg);
    }
    return { detach: () => {}, isAttached: () => false };
  }

  let detached = false;

  // Remember URL, mime, and request postData for each in-flight request
  const pending = new Map<string, { url: string; postData?: string }>();

  // Stable handler refs so we can remove listeners in detach().
  const onMessage = async (_event: unknown, method: string, params: unknown) => {
    try {
      if (method === 'Network.requestWillBeSent') {
        const p = params as any;
        const url = p?.request?.url;
        if (!url || !matchesAny(url)) return;
        const postData = p?.request?.postData;
        pending.set(p.requestId, { url, postData });
      } else if (method === 'Network.responseReceived') {
        const p = params as ResponseReceivedParams;
        const url = p?.response?.url;
        if (!url) return;
        if (!matchesAny(url)) return;
        
        // If we already have it from requestWillBeSent, preserve postData
        const existing = pending.get(p.requestId);
        pending.set(p.requestId, { url, postData: existing?.postData });
      } else if (method === 'Network.loadingFinished') {
        const p = params as LoadingFinishedParams;
        const meta = pending.get(p.requestId);
        if (!meta) return;
        pending.delete(p.requestId);

        if (detached) return;
        let body: string;
        try {
          const res = await wc.debugger.sendCommand('Network.getResponseBody', {
            requestId: p.requestId,
          }) as NetworkResponseBody;
          body = res.base64Encoded
            ? Buffer.from(res.body, 'base64').toString('utf8')
            : res.body;
        } catch {
          // Body may have been evicted from the CDP cache already — skip.
          return;
        }

        // Diagnostic: confirm we actually got a body for inbox responses.
        if (meta.url.indexOf('ViaductInboxData') !== -1) {
          console.log(`[CDP][${label}] inbox body length=${body?.length ?? 0}`);
          if (!body || body.length < 40) {
            console.warn(`[CDP][${label}] inbox body preview: ${JSON.stringify(body)}`);
          }
        }

        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[CDP][${label}] JSON parse failed for ${meta.url.substring(0, 80)}: ${msg}`);
          return;
        }

        // ── Outgoing mutation detection (legacy emitter + new pipeline) ──────
        const isAirbnbOutgoing = AIRBNB_OUTGOING_MUTATIONS.some(m => meta.url.includes(m));
        const isGathernOutgoing = GATHERN_OUTGOING_URL_PATTERNS.some(r => r.test(meta.url));

        if (isAirbnbOutgoing || isGathernOutgoing) {
          const threadId = isAirbnbOutgoing
            ? extractAirbnbThreadId(json, meta.postData)
            : extractGathernThreadId(json, meta.postData);

          const accountIdMatch = meta.url.match(/browserAccountId=([^&]+)/);
          const resolvedBrowserAccountId = accountIdMatch?.[1] ?? browserAccountId;

          if (threadId) {
            const platform: 'airbnb' | 'gathern' = isAirbnbOutgoing ? 'airbnb' : 'gathern';
            const event: OutgoingMessageEvent = { browserAccountId: resolvedBrowserAccountId, threadId, platform };
            console.log(`[CDP][${label}] 📤 Outgoing message detected on thread ${threadId} (${platform}). Emitting outgoing-message-sent.`);
            outgoingMessageEmitter.emit('outgoing-message-sent', event);

            // Extract actual message details from mutation response if available
            let extractedText = '';
            let platformMsgId: string | null = null;
            
            try {
              // Recursive finder
              const findMessageNode = (obj: any): any => {
                if (!obj || typeof obj !== 'object') return null;
                if (obj.__typename === 'Message' || obj.messageText || obj.body || obj.contentPreview) {
                  return obj;
                }
                for (const val of Object.values(obj)) {
                  if (val && typeof val === 'object') {
                    const found = findMessageNode(val);
                    if (found) return found;
                  }
                }
                return null;
              };

              const extractText = (msgNode: any): string => {
                if (!msgNode) return '';
                if (typeof msgNode.message === 'string') return msgNode.message;
                if (typeof msgNode.body === 'string') return msgNode.body;
                if (typeof msgNode.text === 'string') return msgNode.text;
                if (msgNode.contentPreview?.content) return msgNode.contentPreview.content;
                if (msgNode.hydratedContent?.content?.body) return msgNode.hydratedContent.content.body;
                if (msgNode.body?.htmlText) return msgNode.body.htmlText;
                if (msgNode.body?.text) return msgNode.body.text;
                return '';
              };

              const msgNode = findMessageNode(json);
              if (msgNode) {
                extractedText = extractText(msgNode);
                platformMsgId = msgNode.id || msgNode.messageId || msgNode.platformMsgId || null;
                if (platformMsgId) platformMsgId = String(platformMsgId);
              }
            } catch (err) {
              console.warn(`[CDP][${label}] Failed to parse outgoing message node:`, err);
            }

            // Also emit via new live pipeline with outgoing direction
            const liveEvt: LiveMessageEvent = {
              platform,
              browserAccountId: resolvedBrowserAccountId,
              threadId,
              guestName: 'Guest', // will be enriched from thread state
              platformMsgId,
              direction: 'outgoing',
              messageText: extractedText,
              sentAt: new Date().toISOString(),
              preview: makePreview(extractedText),
              source: 'cdp-http-outgoing',
            };
            liveMessageEmitter.emit('live-message', liveEvt);
          } else {
            console.warn(`[CDP][${label}] 📤 Outgoing mutation detected but threadId could not be extracted from response.`);
          }
        }

        // ── Live event extraction & emission ─────────────────────────────────
        const liveEvents = extractLiveEvents(meta.url, json, browserAccountId);
        for (const evt of liveEvents) {
          console.log(`[CDP][${label}] 📨 live-message: dir=${evt.direction} thread=${evt.threadId} preview="${evt.preview.substring(0, 40)}"`);
          liveMessageEmitter.emit('live-message', evt);
        }

        // ── Generic raw handler (for AMSF / IncrementalSyncEngine) ───────────
        try {
          handler(meta.url, json);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[CDP][${label}] handler threw:`, msg);
        }
      } else if (method === 'Network.loadingFailed') {
        const p = params as { requestId: string };
        pending.delete(p?.requestId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CDP][${label}] message handler error:`, msg);
    }
  };

  const onDetach = (_event: unknown, reason: string) => {
    detached = true;
    pending.clear();
    console.log(`[CDP][${label}] debugger detached (${reason})`);
  };

  wc.debugger.on('message', onMessage);
  wc.debugger.on('detach', onDetach);

  // Enable the Network domain. Don't bother turning on body caching via
  // Network.setBypassServiceWorker etc. — the defaults already let
  // getResponseBody succeed for same-origin responses.
  wc.debugger.sendCommand('Network.enable').catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CDP][${label}] Network.enable failed:`, msg);
  });

  console.log(`[CDP][${label}] attached and listening`);

  return {
    isAttached: () => !detached,
    detach: () => {
      if (detached) return;
      detached = true;
      try { wc.debugger.off('message', onMessage as (event: unknown, ...args: unknown[]) => void); } catch {}
      try { wc.debugger.off('detach',  onDetach  as (event: unknown, ...args: unknown[]) => void); } catch {}
      try { wc.debugger.detach(); } catch {}
      pending.clear();
      console.log(`[CDP][${label}] detached (by caller)`);
    },
  };
}
