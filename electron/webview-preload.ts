import { contextBridge, ipcRenderer } from "electron";

// ─────────────────────────────────────────────────────────────────────────────
// Webview preload
//
// Responsibilities (post-CDP migration):
//   1. A narrow `exec-fetch` bridge so the main process can issue writes
//      (sendAirbnbMessage / sendGathernMessage) from the page context where
//      all the right cookies / CSRF tokens already exist.
//   2. A lightweight `webview-log` channel for debugging page-level events.
//   3. Expose a minimal `electronAPI` for page-injected scripts that still
//      forward notifications.
//
// Everything related to capturing responses (fetch/XHR patching, the
// `__agentBridge`, `chat-api-detected`, snapshot IPCs) has been removed —
// response capture is now handled by the Chrome DevTools Protocol attached
// in main.ts (see electron/cdp-interceptor.ts).
// ─────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  const logToMain = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    ipcRenderer.send("webview-log", { msg, type, url: window.location.href });
  };

  logToMain("🛠️  Webview Preload Active (bridge only)");

  // Capture the native fetch once so the bridge never re-enters any patched
  // version a future page script might install.
  const _originalFetch = window.fetch.bind(window);

  ipcRenderer.on('exec-fetch', async (_event, { url, options, requestId }) => {
    try {
      logToMain(`🚀  Bridge fetch: ${url}`);
      // Send ONLY method + body — no custom headers. The browser already
      // carries the correct cookies / CSRF tokens from the live session.
      const bridgeOptions: RequestInit = {
        method: options?.method || 'GET',
      };
      if (options?.body) bridgeOptions.body = options.body;

      const response    = await _originalFetch(url, bridgeOptions);
      const contentType = response.headers.get('content-type') || '';
      const data        = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        const errText = typeof data === 'string' ? data : JSON.stringify(data);
        ipcRenderer.send('exec-fetch-response', {
          success: false,
          error: `HTTP ${response.status}: ${errText.substring(0, 240)}`,
          data,
          requestId,
        });
      } else {
        ipcRenderer.send('exec-fetch-response', { success: true, data, requestId });
      }
    } catch (err: any) {
      logToMain(`❌  Bridge fetch error: ${err.message}`, 'error');
      ipcRenderer.send('exec-fetch-response', { success: false, error: err.message, requestId });
    }
  });
}

contextBridge.exposeInMainWorld("electronAPI", {
  notifyNewNotification: (data: any) => ipcRenderer.send("new-notification-from-webview", data),
  onMessageReceived:     (callback: any) => ipcRenderer.on("page-command", (_event, data) => callback(data)),
  sendToMain:            (channel: string, data: any) => ipcRenderer.send(channel, data),
});

console.log("[WebView Preload] ✅  Loaded — exec-fetch bridge only");
