import type { WebContents } from 'electron';
import { EventEmitter } from 'events';

// ─────────────────────────────────────────────────────────────────────────────
// CDP (Chrome DevTools Protocol) Network Interceptor
// ─────────────────────────────────────────────────────────────────────────────

export interface RawPlatformEvent {
  accountId: string;
  platform: 'airbnb' | 'gathern';
  operationName: string;
  timestamp: string;
  url: string;
  headers: Record<string, string>;
  payload: any;
  requestBody?: any;
}

export const cdpEventEmitter = new EventEmitter();

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

function extractOperationName(url: string, postData?: string): string {
  // If it's GraphQL, usually the operation name is in the URL path, or in the postData.
  const match = url.match(/\/api\/v3\/([a-zA-Z0-9_]+)/);
  if (match) return match[1];

  if (postData) {
    try {
      const json = JSON.parse(postData);
      if (json.operationName) return json.operationName;
    } catch {}
  }

  // Fallbacks for Gathern or generic
  if (url.includes('chatapi-prod.gathern.co')) return 'GathernSendMessage';
  if (url.includes('business.gathern.co/api/v2/user_chat')) return 'GathernInboxSync';

  return 'UnknownOperation';
}

export interface CdpInterceptorHandle {
  detach: () => void;
  isAttached: () => boolean;
}

export function attachCdpInterceptor(
  wc: WebContents,
  opts: { platform: 'airbnb' | 'gathern'; browserAccountId: string }
): CdpInterceptorHandle {
  const { platform, browserAccountId } = opts;

  try {
    wc.debugger.attach('1.3');
  } catch (e: unknown) {
    return { detach: () => {}, isAttached: () => false };
  }

  let detached = false;
  const pending = new Map<string, { url: string; postData?: string; headers?: any }>();

  const onMessage = async (_event: unknown, method: string, params: unknown) => {
    try {
      if (method === 'Network.requestWillBeSent') {
        const p = params as any;
        const url = p?.request?.url;
        if (!url || !matchesAny(url)) return;
        pending.set(p.requestId, { url, postData: p?.request?.postData, headers: p?.request?.headers });
      } else if (method === 'Network.responseReceived') {
        const p = params as any;
        const url = p?.response?.url;
        if (!url || !matchesAny(url)) return;
        
        const existing = pending.get(p.requestId);
        pending.set(p.requestId, { 
          url, 
          postData: existing?.postData, 
          headers: p?.response?.headers 
        });
      } else if (method === 'Network.loadingFinished') {
        const p = params as any;
        const meta = pending.get(p.requestId);
        if (!meta) return;
        pending.delete(p.requestId);

        if (detached) return;
        let bodyStr: string;
        try {
          const res = await wc.debugger.sendCommand('Network.getResponseBody', { requestId: p.requestId }) as any;
          bodyStr = res.base64Encoded ? Buffer.from(res.body, 'base64').toString('utf8') : res.body;
        } catch {
          return;
        }

        let payload: any;
        try {
          payload = JSON.parse(bodyStr);
        } catch {
          return; // Ignore non-JSON
        }

        let requestBody: any;
        if (meta.postData) {
          try { requestBody = JSON.parse(meta.postData); } catch {}
        }

        const rawEvent: RawPlatformEvent = {
          accountId: browserAccountId,
          platform,
          operationName: extractOperationName(meta.url, meta.postData),
          timestamp: new Date().toISOString(),
          url: meta.url,
          headers: meta.headers || {},
          payload,
          requestBody
        };

        cdpEventEmitter.emit('raw-event', rawEvent);
      }
    } catch (err) {
      console.error(`[CDP] Error processing message:`, err);
    }
  };

  wc.debugger.on('message', onMessage);
  wc.debugger.sendCommand('Network.enable').catch(() => {});

  return {
    detach: () => {
      if (detached) return;
      detached = true;
      try {
        wc.debugger.off('message', onMessage);
        wc.debugger.sendCommand('Network.disable').catch(() => {});
        wc.debugger.detach();
      } catch {}
    },
    isAttached: () => !detached,
  };
}
