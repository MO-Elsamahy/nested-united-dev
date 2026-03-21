// lib/utils/isElectron.ts
// Detects whether the app is running inside Electron desktop app

export function isElectron(): boolean {
    if (typeof window === "undefined") return false;
    // window.electronAPI is injected by Electron's preload.ts
    return typeof (window as any).electronAPI !== "undefined";
}
