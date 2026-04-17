import type { WebContents } from 'electron';

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

export type CdpSnapshotHandler = (url: string, json: unknown) => void;

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
  opts: { label?: string } = {}
): CdpInterceptorHandle {
  const label = opts.label || 'cdp';

  try {
    wc.debugger.attach('1.3');
  } catch (e: any) {
    // Already attached (usually by DevTools) — caller can retry later.
    if (!String(e?.message || '').includes('already attached')) {
      console.warn(`[CDP][${label}] attach failed:`, e?.message);
    }
    return { detach: () => {}, isAttached: () => false };
  }

  let detached = false;

  // Remember URL + mime for each in-flight request so we can decide whether
  // to ask for its body in loadingFinished.
  const pending = new Map<string, { url: string }>();

  // Stable handler refs so we can remove listeners in detach().
  const onMessage = async (_event: unknown, method: string, params: any) => {
    try {
      if (method === 'Network.responseReceived') {
        const url = params?.response?.url as string | undefined;
        if (!url) return;
        if (!matchesAny(url)) return;
        pending.set(params.requestId, { url });
      } else if (method === 'Network.loadingFinished') {
        const meta = pending.get(params.requestId);
        if (!meta) return;
        pending.delete(params.requestId);

        if (detached) return;
        let body: string;
        try {
          const res = await wc.debugger.sendCommand('Network.getResponseBody', {
            requestId: params.requestId,
          });
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
        } catch (err: any) {
          console.warn(`[CDP][${label}] JSON parse failed for ${meta.url.substring(0, 80)}: ${err?.message}`);
          return;
        }

        try {
          handler(meta.url, json);
        } catch (err: any) {
          console.warn(`[CDP][${label}] handler threw:`, err?.message);
        }
      } else if (method === 'Network.loadingFailed') {
        pending.delete(params?.requestId);
      }
    } catch (err: any) {
      console.warn(`[CDP][${label}] message handler error:`, err?.message);
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
  wc.debugger.sendCommand('Network.enable').catch((err: any) => {
    console.warn(`[CDP][${label}] Network.enable failed:`, err?.message);
  });

  console.log(`[CDP][${label}] attached and listening`);

  return {
    isAttached: () => !detached,
    detach: () => {
      if (detached) return;
      detached = true;
      try { wc.debugger.off('message', onMessage as any); } catch {}
      try { wc.debugger.off('detach',  onDetach  as any); } catch {}
      try { wc.debugger.detach(); } catch {}
      pending.clear();
      console.log(`[CDP][${label}] detached (by caller)`);
    },
  };
}
