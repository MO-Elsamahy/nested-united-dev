import { contextBridge, ipcRenderer } from "electron";

// Listen for custom events from the injected page script
if (typeof window !== 'undefined') {
  window.addEventListener("message", (event: MessageEvent) => {
    // Only accept messages from same origin
    if (event.source !== window) return;
    
    if (event.data && event.data.type === "NEW_NOTIFICATION") {
      console.log("[WebView Preload] Received notification event:", event.data.payload);
      ipcRenderer.send("new-notification-from-webview", event.data.payload);
    }
  });
}

// Expose limited API for webviews (platform pages)
contextBridge.exposeInMainWorld("electronAPI", {
  // Notify main process about new notifications
  notifyNewNotification: (data: {
    accountId: string;
    accountName: string;
    platform: string;
    count: number;
  }) => {
    ipcRenderer.send("new-notification-from-webview", data);
  },
});

console.log("[WebView Preload] Loaded successfully");

