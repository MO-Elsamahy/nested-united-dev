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
  openBrowserAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  closeBrowserAccount: (accountId: string) => Promise<{ success: boolean }>;
  browserGoBack: (accountId: string) => Promise<void>;
  browserGoForward: (accountId: string) => Promise<void>;
  browserReload: (accountId: string) => Promise<void>;
  browserGoHome: (accountId: string) => Promise<void>;
  onBrowserNotification: (callback: (data: any) => void) => void;
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
  onSyncComplete: (callback: (data: { accountId: string; platform: string }) => void) => void;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export { };


