export interface ElectronAPI {
  getPlatformMessages: (params: unknown) => Promise<{ success: boolean; messages?: unknown[] }>;
  forcePlatformSync: (accountId: string) => Promise<void>;
  openBrowserAccount: (params: { id: string; platform: string; accountName: string; partition: string }) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
