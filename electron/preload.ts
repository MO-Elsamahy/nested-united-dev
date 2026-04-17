import { contextBridge, ipcRenderer } from "electron";

// Expose Electron APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  // Browser accounts management
  getBrowserAccounts: () => ipcRenderer.invoke("get-browser-accounts"),
  addBrowserAccount: (account: {
    id: string;
    platform: "airbnb" | "gathern" | "whatsapp";
    accountName: string;
    partition: string;
  }) => ipcRenderer.invoke("add-browser-account", account),
  removeBrowserAccount: (accountId: string) =>
    ipcRenderer.invoke("remove-browser-account", accountId),
  openBrowserAccount: (data: {
    id: string;
    platform: string;
    accountName: string;
    partition: string;
  }) => ipcRenderer.invoke("open-browser-account", data),
  closeBrowserAccount: (accountId: string) =>
    ipcRenderer.invoke("close-browser-account", accountId),
  openAuthWindow: (data: {
    platform: string;
    accountId: string;
    partition: string;
  }) => ipcRenderer.invoke("open-auth-window", data),

  // Browser navigation controls
  browserGoBack: (accountId: string) =>
    ipcRenderer.invoke("browser-go-back", accountId),
  browserGoForward: (accountId: string) =>
    ipcRenderer.invoke("browser-go-forward", accountId),
  browserReload: (accountId: string) =>
    ipcRenderer.invoke("browser-reload", accountId),
  browserGoHome: (accountId: string) =>
    ipcRenderer.invoke("browser-go-home", accountId),

  // Notification handling
  onBrowserNotification: (callback: (data: any) => void) => {
    ipcRenderer.on("browser-notification", (_, data) => callback(data));
  },

  // Play notification sound
  onPlayNotificationSound: (callback: () => void) => {
    ipcRenderer.on("play-notification-sound", callback);
  },

  // Database notification
  onDatabaseNotification: (callback: (data: any) => void) => {
    ipcRenderer.on("database-notification", (_, data) => callback(data));
  },
  onNewPlatformMessage: (callback: (data: any) => void) => {
    ipcRenderer.on("new-platform-message", (_, data) => callback(data));
  },
  // New event: polling service found new messages
  onPlatformMessagesUpdated: (callback: (data: { accountId: string; newCount: number }) => void) => {
    ipcRenderer.on('platform-messages-updated', (_, data) => callback(data));
  },
  offPlatformMessagesUpdated: (callback: any) => {
    ipcRenderer.removeListener('platform-messages-updated', callback);
  },
  sendDatabaseNotification: (data: { title: string; body: string; id: string }) => {
    ipcRenderer.send("database-notification", data);
  },

  // Check if running in Electron
  isElectron: true,

  // Test notification
  testNotification: (data: {
    accountId: string;
    accountName: string;
    platform: "airbnb" | "gathern";
    count: number;
  }) => ipcRenderer.invoke("test-notification", data),

  // Tabs management
  getOpenTabs: () => ipcRenderer.invoke("get-open-tabs"),
  focusTab: (accountId: string) => ipcRenderer.invoke("focus-tab", accountId),
  onTabsChanged: (callback: () => void) => {
    ipcRenderer.on("tabs-changed", callback);
  },
  forcePlatformSync: (accountId: string) =>
    ipcRenderer.invoke("force-platform-sync", accountId),
  onSyncComplete: (callback: (data: { accountId: string; platform: string }) => void) => {
    ipcRenderer.on("sync-complete", (_, data) => callback(data));
  },
  sendMessage: (payload: { accountId: string; platform: 'airbnb' | 'gathern'; threadId: string; text: string; metadata?: any }) =>
    ipcRenderer.invoke('send-message', payload),

  // Platform messages (direct DB read — useful for debugging)
  getPlatformMessages: (params: { accountId?: string; limit?: number }) =>
    ipcRenderer.invoke('get-platform-messages', params),

  // Session health (latest per account)
  getSessionHealth: () =>
    ipcRenderer.invoke('get-session-health'),

  // Session health change event (pushed by polling service)
  onSessionHealthChanged: (callback: (data: { accountId: string; healthy: boolean; reason: string }) => void) => {
    ipcRenderer.on('session-health-changed', (_, data) => callback(data));
  },
  offSessionHealthChanged: (callback: any) => {
    ipcRenderer.removeListener('session-health-changed', callback);
  },
});
