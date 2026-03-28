import { contextBridge, ipcRenderer } from "electron";

// Robust Interceptor for Gathern & Airbnb Real-time Detection
if (typeof window !== 'undefined') {
  const logToTerminal = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    ipcRenderer.send("webview-log", { msg, type, url: window.location.href });
  };

  logToTerminal("🛠️ Webview Preload Active (Interceptor Disabled - Using Main Process Polling)");

  // --- EXECUTE FETCH BRIDGE ---
  // This allows the main process to trigger a fetch FROM the browser context
  // This is the STRONGEST way to bypass ERR_BLOCKED_BY_CLIENT
  ipcRenderer.on('exec-fetch', async (event, { url, options, requestId }) => {
    try {
      console.log(`[WebView Bridge] 🚀 Executing fetch for: ${url}`);
      const response = await window.fetch(url, options);
      const data = await response.json();
      ipcRenderer.send('exec-fetch-response', { success: response.ok, data, requestId });
    } catch (err: any) {
      console.error(`[WebView Bridge] ❌ Fetch Error:`, err);
      ipcRenderer.send('exec-fetch-response', { success: false, error: err.message, requestId });
    }
  });
}

// Expose API for the platforms (optional, if we want to trigger actions from UI)
contextBridge.exposeInMainWorld("electronAPI", {
  notifyNewNotification: (data: any) => ipcRenderer.send("new-notification-from-webview", data),
  onMessageReceived: (callback: any) => ipcRenderer.on("page-command", (event, data) => callback(data)),
  sendToMain: (channel: string, data: any) => ipcRenderer.send(channel, data)
});

console.log("[WebView Preload] ✅ Loaded successfully");
