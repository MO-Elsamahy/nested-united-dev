import { contextBridge, ipcRenderer } from "electron";

// Robust Interceptor for Gathern & Airbnb Real-time Detection
if (typeof window !== 'undefined') {
  const logToTerminal = (msg: string, type: 'info' | 'warn' | 'error' = 'info') => {
    ipcRenderer.send("webview-log", { msg, type, url: window.location.href });
  };

  logToTerminal("🛠️ Webview Preload Active (Interceptor Disabled - Using Main Process Polling)");
}

// Expose API for the platforms (optional, if we want to trigger actions from UI)
contextBridge.exposeInMainWorld("electronAPI", {
  notifyNewNotification: (data: any) => ipcRenderer.send("new-notification-from-webview", data),
  onMessageReceived: (callback: any) => ipcRenderer.on("page-command", (event, data) => callback(data)),
  sendToMain: (channel: string, data: any) => ipcRenderer.send(channel, data)
});

console.log("[WebView Preload] ✅ Loaded successfully");
