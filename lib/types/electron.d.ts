// Type declarations for Electron API exposed via preload
interface ElectronAPI {
  getBrowserAccounts: () => Promise<
    Array<{
      id: string;
      platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
      accountName: string;
      partition: string;
      isOpen?: boolean;
    }>
  >;
  openAuthWindow: (data: {
    platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
    accountId: string;
    partition: string;
  }) => Promise<{ success: boolean; error?: string }>;
  addBrowserAccount: (account: {
    id: string;
    platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
    accountName: string;
    partition: string;
  }) => Promise<{ success: boolean }>;
  removeBrowserAccount: (accountId: string) => Promise<{ success: boolean }>;
  openBrowserAccount: (data: {
    id: string;
    platform: string;
    accountName: string;
    partition: string;
  }) => Promise<{ success: boolean; error?: string }>;
  closeBrowserAccount: (accountId: string) => Promise<{ success: boolean }>;
  browserGoBack: (accountId: string) => Promise<void>;
  browserGoForward: (accountId: string) => Promise<void>;
  browserReload: (accountId: string) => Promise<void>;
  browserGoHome: (accountId: string) => Promise<void>;
  onBrowserNotification: (callback: (data: { accountId: string; accountName: string; platform: string; title: string; body: string; count: number }) => void) => void;
  onPlayNotificationSound: (callback: () => void) => void;
  testNotification: (data: {
    accountId: string;
    accountName: string;
    platform: "airbnb" | "gathern" | "zomrahub";
    count: number;
  }) => Promise<{ success: boolean }>;
  getOpenTabs: () => Promise<
    Array<{
      id: string;
      platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
      accountName: string;
      title: string;
      url: string;
      isFocused: boolean;
    }>
  >;
  focusTab: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  onTabsChanged: (callback: () => void) => void;
  onDatabaseNotification: (callback: (data: { title: string; body: string; id: string }) => void) => void;
  sendDatabaseNotification: (data: { title: string; body: string; id: string }) => void;
  forcePlatformSync: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  getPlatformMessages: (params: { accountId?: string; platform?: string; limit?: number }) => Promise<{ success: boolean; messages: Array<{
    id: string;
    platform_account_id: string;
    platform: "airbnb" | "gathern" | "whatsapp" | "zomrahub";
    thread_id: string;
    platform_msg_id: string;
    guest_name: string;
    message_text: string;
    is_from_me: number;
    sent_at: string;
    received_at: string;
    account_name?: string;
    raw_data?: string;
  }>; error?: string }>;
  sendMessage: (params: { 
    accountId: string; 
    platform: string; 
    threadId: string; 
    text: string; 
    metadata: { unitId?: string; reservationId?: string } 
  }) => Promise<{ success: boolean; error?: string }>;
  onSyncComplete: (callback: (data: { accountId: string; platform: string }) => void) => void;
  onPlatformMessagesUpdated: (callback: () => void) => void;
  offPlatformMessagesUpdated: (callback: () => void) => void;
  onSessionHealthChanged: (callback: (data: { accountId: string; healthy: boolean }) => void) => void;
  offSessionHealthChanged: (callback: (data: { accountId: string; healthy: boolean }) => void) => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export { };


