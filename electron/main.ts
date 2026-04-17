import {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  session,
  Notification,
  Menu,
  Tray,
  nativeImage,
  shell,
  dialog,
} from "electron";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcess } from "child_process";
import mysql from "mysql2/promise";
import { PollingService } from "./polling-service";
import { BrowserAccountSession, sendPlatformMessage, browserSessions, loadSavedSessions, saveSessions, resolveBridgeResponse } from "./platform-api";
import { attachCdpInterceptor, CdpInterceptorHandle } from "./cdp-interceptor";

// Track active CDP interceptors per account so we can detach/reattach on
// DevTools open/close and on window destruction without leaking handles.
const cdpHandles = new Map<string, CdpInterceptorHandle>();

let nextServerProcess: ChildProcess | null = null;

// Start Next.js standalone server
async function startNextServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const port = 3456;

    let serverPath: string;
    let cwd: string;

    if (app.isPackaged) {
      const resourcesPath = path.join(process.resourcesPath, "app.asar.unpacked");
      serverPath = path.join(resourcesPath, ".next/standalone/server.js");
      cwd = path.join(resourcesPath, ".next/standalone");

      if (!fs.existsSync(serverPath)) {
        const asarPath = path.join(process.resourcesPath, "app.asar");
        serverPath = path.join(asarPath, ".next/standalone/server.js");
        cwd = path.join(asarPath, ".next/standalone");
      }
    } else {
      serverPath = path.join(__dirname, "../.next/standalone/server.js");
      cwd = path.join(__dirname, "../.next/standalone");
    }

    console.log("Starting Next.js server from:", serverPath);

    if (!fs.existsSync(serverPath)) {
      console.error("Server file not found:", serverPath);
      resolve(3000);
      return;
    }

    const env = {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "localhost",
      NODE_ENV: "production",
    };

    nextServerProcess = spawn("node", [serverPath], {
      env,
      cwd,
      shell: true,
    });

    nextServerProcess.stdout?.on("data", (data) => {
      console.log(`Next.js: ${data}`);
      if (data.toString().includes("Ready") || data.toString().includes("started") || data.toString().includes("Listening")) {
        resolve(port);
      }
    });

    nextServerProcess.stderr?.on("data", (data) => {
      console.error(`Next.js error: ${data}`);
    });

    nextServerProcess.on("error", (err) => {
      console.error("Failed to start Next.js server:", err);
      resolve(3000);
    });

    setTimeout(() => resolve(port), 5000);
  });
}

function stopNextServer() {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
}

// Store for browser accounts sessions
// BrowserAccountSession is now imported from ./platform-api

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let pollingService: PollingService | null = null;
const isDev = !app.isPackaged;
const PROD_APP_URL = process.env.APP_URL || "https://go.nestedunited.com/";
let isAppQuitting = false;
const APP_USER_MODEL_ID = "com.rentals.dashboard";

app.setAppUserModelId(APP_USER_MODEL_ID);

function createMainWindow() {
  // إنشاء session منفصل للداشبورد الرئيسي
  // هذا يمنع مشاركة cookies مع المتصفح العادي
  // استخدام "persist:" يضمن حفظ الـ cookies بشكل دائم
  const dashboardSession = session.fromPartition("persist:dashboard-main", {
    cache: true,
  });


  // ── Token Sniffer: يلتقط authTokens من الـ requests الصادرة تلقائياً ──
  // لما المستخدم يفتح chat tab في Gathern، الـ browser بيبعت Authorization header
  // بنالتقطه ونخزنه في browserSessions وكمان في DB

  dashboardSession.webRequest.onBeforeSendHeaders(
    { urls: [
        '*://chatapi-prod.gathern.co/*',  // Chat API — contains chatAuthToken
        '*://api.gathern.co/*',           // Profile API — contains authToken
        '*://www.airbnb.com/api/v3/ViaductInboxData/*', // Airbnb Inbox
      ]
    },
    async (details, callback) => {
      callback({ requestHeaders: details.requestHeaders });

      try {
        const headers = details.requestHeaders;
        const authHeader = headers['Authorization'] || headers['authorization'];
        
        // --- GATHERN TOKEN & USER ID SNIFFING ---
        if (details.url.includes('gathern.co') && authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '').trim();
          if (token.length < 8) return;

          const isChatToken = details.url.includes('chatapi-prod.gathern.co');
          const field = isChatToken ? 'chatAuthToken' : 'authToken';
          
          // Extract userId from Gathern token (e.g. "72331719|...")
          let extractedUserId: string | null = null;
          if (isChatToken && token.includes('|')) {
            extractedUserId = token.split('|')[0];
          }

          let updated = false;
          for (const [id, acct] of browserSessions.entries()) {
            if (acct.platform === 'gathern') {
              let acctUpdated = false;
              if (acct[field] !== token) {
                (acct as any)[field] = token;
                acctUpdated = true;
              }
              if (extractedUserId && acct.platformUserId !== extractedUserId) {
                acct.platformUserId = extractedUserId;
                acctUpdated = true;
              }

              if (acctUpdated) {
                updated = true;
                try {
                  const conn = await getMainDbConnection();
                  const col = isChatToken ? 'chat_auth_token' : 'auth_token';
                  await conn.execute(
                    `UPDATE browser_accounts SET ${col} = ?, platform_user_id = COALESCE(?, platform_user_id) WHERE id = ?`,
                    [token, extractedUserId, id]
                  );
                  await conn.end();
                  console.log(`[Token Sniffer] ✅ Gathern ${field} & userId saved for ${id}`);
                } catch (e: any) { console.error(`[Token Sniffer] DB Error:`, e.message); }
              }
            }
          }
          if (updated) saveSessions();
        }

        // --- AIRBNB USER ID SNIFFING ---
        if (details.url.includes('airbnb.com')) {
          const airbnbUserId = headers['x-airbnb-authenticated-user-id']?.toString();
          if (airbnbUserId) {
             let updated = false;
             for (const [id, acct] of browserSessions.entries()) {
               if (acct.platform === 'airbnb' && acct.platformUserId !== airbnbUserId) {
                 acct.platformUserId = airbnbUserId;
                 updated = true;
                 try {
                   const conn = await getMainDbConnection();
                   await conn.execute(`UPDATE browser_accounts SET platform_user_id = ? WHERE id = ?`, [airbnbUserId, id]);
                   await conn.end();
                   console.log(`[Token Sniffer] ✅ Airbnb userId (${airbnbUserId}) saved for ${id}`);
                 } catch { /* silent */ }
               }
             }
             if (updated) saveSessions();
          }
        }

      } catch (e: any) { /* silent error */ }
    }
  );


  // --- WEBVIEW FETCH BRIDGE HANDLER ---
  // Routes exec-fetch-response from webview preload → platform-api promise map
  ipcMain.on('exec-fetch-response', (_event, response) => {
    resolveBridgeResponse(response);
  });

  dashboardSession.webRequest.onCompleted(
    { urls: ['*://business.gathern.co/api/*', '*://api.gathern.co/*', '*://chatapi-prod.gathern.co/*'] },
    (details) => {
      if (details.statusCode >= 400) {
        console.log(`\x1b[31m[Gathern] ❌ ${details.method} ${details.url.substring(0, 80)} → ${details.statusCode}\x1b[0m`);
      }
    }
  );



  const iconPath = isDev
    ? path.join(__dirname, "../../build/icon.ico") // __dirname = electron/dist/, so ../../ = project root
    : path.join(process.resourcesPath, "build", "icon.ico");

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "NestedUnited",
    icon: iconPath,
    webPreferences: {
      session: dashboardSession, // استخدام session منفصل
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    // DevTools will open manually with F12 if needed
  } else {
    // في الإنتاج: تم تحويل التطبيق ليعتمد على الخادم المحلي (Localhost) بدلاً من Netlify
    // mainWindow.loadURL(PROD_APP_URL);
    
    startNextServer().then((port) => mainWindow?.loadURL(`http://localhost:${port}`));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("close", (event) => {
    // On Windows/Linux, close the app when clicking X
    // On macOS, hide to tray (macOS behavior)
    if (process.platform === "darwin") {
      if (!isAppQuitting) {
        event.preventDefault();
        mainWindow?.hide();
      }
    } else {
      // Windows/Linux: Close the app
      isAppQuitting = true;
      app.quit();
    }
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "ملف",
      submenu: [
        { label: "تحديث", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.reload() },
        { type: "separator" },
        { label: "خروج", accelerator: "CmdOrCtrl+Q", click: () => { isAppQuitting = true; app.quit(); } },
      ],
    },
    {
      label: "عرض",
      submenu: [
        { label: "تكبير", accelerator: "CmdOrCtrl+Plus", click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: "تصغير", accelerator: "CmdOrCtrl+-", click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: "حجم عادي", accelerator: "CmdOrCtrl+0", click: () => mainWindow?.webContents.setZoomLevel(0) },
        { type: "separator" },
        { label: "أدوات المطور", accelerator: "F12", click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, "../../build/icon.ico") // __dirname = electron/dist/, so ../../ = project root
    : path.join(process.resourcesPath, "build", "icon.ico");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.resize({ width: 16, height: 16 }));

  const contextMenu = Menu.buildFromTemplate([
    { label: "فتح البرنامج", click: () => mainWindow?.show() },
    { type: "separator" },
    { label: "خروج", click: () => { isAppQuitting = true; app.quit(); } },
  ]);

  tray.setToolTip("NestedUnited");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => mainWindow?.show());
}

// Create a separate browser window for platform account
function createBrowserWindow(accountSession: BrowserAccountSession): BrowserWindow {
  // استخدام "persist:" يضمن حفظ الـ cookies بشكل دائم حتى بعد إغلاق البرنامج
  const partition = `persist:${accountSession.partition}`;
  const ses = session.fromPartition(partition, {
    cache: true,
  });

  // Configure session to persist cookies forever
  // Auto-flush cookies to disk whenever they change
  ses.cookies.on('changed', () => {
    // Ensure cookies are saved immediately to disk
    ses.cookies.flushStore().catch(err => {
      console.error('Error flushing cookies:', err);
    });
  });

  // Set a real Chrome User-Agent to avoid detection
  const chromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  ses.setUserAgent(chromeUserAgent);

  // Intercept requests for discovery (minimal)
  ses.webRequest.onBeforeSendHeaders({ urls: ["*://*.gathern.co/*", "*://*.airbnb.com/*"] }, (details, callback) => {
    const apiKey = details.requestHeaders['X-Airbnb-API-Key'] || details.requestHeaders['x-airbnb-api-key'];
    if (apiKey) {
       const sessionObj = browserSessions.get(accountSession.id);
       if (sessionObj && sessionObj.authToken !== apiKey) {
         console.log(`\x1b[32m[Sniffer][${accountSession.id}] 🕵️ Captured Airbnb API Key: ${apiKey.toString().substring(0, 10)}...\x1b[0m`);
         sessionObj.authToken = apiKey.toString();
         saveSessions(); 
       }
    }

    // Gathern Token Sniffing (from Authorization header)
    const authHeader = details.requestHeaders['Authorization'] || details.requestHeaders['authorization'];
    if (authHeader && authHeader.toString().startsWith('Bearer ')) {
       const token = authHeader.toString().substring(7);
       const sessionObj = browserSessions.get(accountSession.id);
       if (sessionObj && sessionObj.authToken !== token) {
         console.log(`\x1b[32m[Sniffer][${accountSession.id}] 🕵️ Captured Gathern Bearer Token: ${token.substring(0, 10)}...\x1b[0m`);
         sessionObj.authToken = token;
         saveSessions(); 
       }
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // Phase 2: Discovery Logger & Token Sniffer for Gathern/Airbnb
  ses.webRequest.onCompleted({ urls: ['*://business.gathern.co/api/*', '*://api.gathern.co/*', '*://www.airbnb.com/api/*'] }, (details) => {
    if (details.method !== 'OPTIONS' && details.statusCode === 200) {
      console.log(`\x1b[33m[Discovery API] ${details.method} ${details.url} -> ${details.statusCode}\x1b[0m`);
      
      const sessionObj = browserSessions.get(accountSession.id);
      if (!sessionObj) return;

      // Sniff Gathern Token
      if (details.url.includes('access-token=')) {
        const urlParams = new URL(details.url).searchParams;
        const token = urlParams.get('access-token');
        if (token && sessionObj.authToken !== token) {
            console.log(`\x1b[32m[Sniffer][${accountSession.id}] 🕵️ Captured Gathern Access Token: ${token.substring(0, 10)}...\x1b[0m`);
            sessionObj.authToken = token;
            saveSessions();
        }
      }

      // Sniff Airbnb UserID (Base64)
      if (details.url.includes('ViaductInboxData') || details.url.includes('UserId')) {
        const userIdMatch = details.url.match(/userId%22%3A%22([^%]+)%22/);
        if (userIdMatch && userIdMatch[1]) {
            const userId = decodeURIComponent(userIdMatch[1]);
            if (sessionObj.platformUserId !== userId) {
                console.log(`\x1b[32m[Sniffer][${accountSession.id}] 🕵️ Captured Airbnb UserID: ${userId}\x1b[0m`);
                sessionObj.platformUserId = userId;
            }
        }
      }
    }
  });

  const platformColors = {
    airbnb: "#FF5A5F",
    gathern: "#10B981",
    whatsapp: "#25D366",
  };

  const iconPath = isDev
    ? path.join(__dirname, "../build/icon.ico")
    : path.join(process.resourcesPath, "build", "icon.ico");

  const browserWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: `${accountSession.accountName} - ${accountSession.platform === "airbnb" ? "Airbnb" : "Gathern"}`,
    icon: iconPath,
    webPreferences: {
      session: ses,
      preload: path.join(__dirname, "webview-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: platformColors[accountSession.platform as keyof typeof platformColors] || "#CCCCCC",
      symbolColor: "#ffffff",
      height: 40,
    },
  });

  const platformUrl =
    accountSession.platform === "airbnb"
      ? "https://www.airbnb.com/hosting/inbox"
      : accountSession.platform === "gathern"
        ? "https://business.gathern.co/app/chat"
        : "https://web.whatsapp.com";

  browserWindow.loadURL(platformUrl, {
    userAgent: chromeUserAgent,
  });

  browserWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Browser Window] ❌ Failed to load URL: ${validatedURL} | Error: ${errorDescription} (${errorCode})`);
  });

  // Enable F12 to open DevTools
  browserWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12") {
      browserWindow.webContents.toggleDevTools();
    }
    // Also support Ctrl+Shift+I
    if (input.control && input.shift && input.key === "I") {
      browserWindow.webContents.toggleDevTools();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CHROME DEVTOOLS PROTOCOL NETWORK INTERCEPTOR
  // Sits at the network layer, so it captures every Airbnb / Gathern API
  // response regardless of whether the page used fetch, XHR, WebSocket or a
  // service worker. The captured JSON is routed to the polling service.
  //
  // Only one CDP client can attach at a time, so we detach when the user
  // opens Chromium DevTools and re-attach when they close it.
  // ──────────────────────────────────────────────────────────────────────────
  const attachCdp = () => {
    if (accountSession.platform !== 'airbnb' && accountSession.platform !== 'gathern') return;
    // Avoid stacking: detach any existing handle first.
    cdpHandles.get(accountSession.id)?.detach();
    const handle = attachCdpInterceptor(
      browserWindow.webContents,
      (url, json) => {
        if (!pollingService) return;
        pollingService
          .processSnapshot(accountSession.id, url, json)
          .catch(err => console.warn(`[CDP][${accountSession.accountName}] process error:`, err?.message));
      },
      { label: accountSession.accountName }
    );
    cdpHandles.set(accountSession.id, handle);
  };

  // Attach as early as possible — dom-ready fires before the SPA's first API
  // calls, ensuring we don't miss the initial inbox payload.
  browserWindow.webContents.on('dom-ready', () => {
    console.log("[Browser Window] DOM ready");
    attachCdp();
  });

  browserWindow.webContents.on('did-finish-load', () => {
    console.log("[Browser Window] Page loaded");
    browserWindow.webContents.insertCSS(`
      .announcement-banner { display: none !important; }
    `);
  });

  browserWindow.webContents.on("did-navigate-in-page", () => {
    // Same WebContents, same CDP session — nothing to do.
  });

  browserWindow.webContents.on("did-navigate", () => {
    // Full navigation keeps the same WebContents too; CDP stays attached.
    // No-op unless we ever need to reset pending-request state.
  });

  // DevTools can't coexist with our CDP client. Swap cleanly on user request.
  browserWindow.webContents.on('devtools-opened', () => {
    const h = cdpHandles.get(accountSession.id);
    if (h) {
      console.log(`[CDP][${accountSession.accountName}] detaching for DevTools`);
      h.detach();
      cdpHandles.delete(accountSession.id);
    }
  });

  browserWindow.webContents.on('devtools-closed', () => {
    console.log(`[CDP][${accountSession.accountName}] re-attaching after DevTools`);
    attachCdp();
  });

  browserWindow.webContents.on('destroyed', () => {
    cdpHandles.get(accountSession.id)?.detach();
    cdpHandles.delete(accountSession.id);
  });

  // Handle page title updates
  browserWindow.webContents.on("page-title-updated", (event, title) => {
    browserWindow.setTitle(`${accountSession.accountName} - ${title}`);
  });

  // Handle external links
  browserWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Add context menu for DevTools
  browserWindow.webContents.on("context-menu", (event, params) => {
    const isDevToolsOpened = browserWindow.webContents.isDevToolsOpened();
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "رجوع",
        enabled: browserWindow.webContents.canGoBack(),
        click: () => browserWindow.webContents.goBack(),
      },
      {
        label: "تقدم",
        enabled: browserWindow.webContents.canGoForward(),
        click: () => browserWindow.webContents.goForward(),
      },
      {
        label: "إعادة تحميل",
        click: () => browserWindow.webContents.reload(),
      },
      { type: "separator" },
      {
        label: "فحص العنصر (DevTools)",
        click: () => {
          browserWindow.webContents.inspectElement(params.x, params.y);
        },
      },
      {
        label: isDevToolsOpened ? "إخفاء أدوات المطور" : "إظهار أدوات المطور",
        accelerator: "F12",
        click: () => {
          browserWindow.webContents.toggleDevTools();
        },
      },
    ]);
    contextMenu.popup();
  });

  // Handle window close
  browserWindow.on("closed", () => {
    cdpHandles.get(accountSession.id)?.detach();
    cdpHandles.delete(accountSession.id);
    const account = browserSessions.get(accountSession.id);
    if (account) {
      account.window = undefined;
    }
    // Notify dashboard about tab change
    notifyTabsChanged();
  });

  // Handle window focus/blur to update tab state
  browserWindow.on("focus", () => {
    notifyTabsChanged();
  });

  browserWindow.on("blur", () => {
    notifyTabsChanged();
  });

  // Handle title updates
  browserWindow.on("page-title-updated", () => {
    notifyTabsChanged();
  });

  return browserWindow;
}

// Notify dashboard about tabs changes
function notifyTabsChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("tabs-changed");
  }
}

// Inject script to monitor notifications
function injectNotificationMonitor(browserWindow: BrowserWindow, account: BrowserAccountSession) {
  // Special handling for WhatsApp - Badge Monitoring
  if (account.platform === "whatsapp") {
    const whatsappMonitor = `
      (function() {
        console.log('[WhatsApp Monitor] 🚀 Started for ${account.accountName}');
        
        let previousTotalUnread = -1;
        let baselineSet = false;
        let checkInterval = null;
        
        function checkForNewMessages() {
          try {
            // Method 1: Count unread badges (green badges with numbers)
            const unreadBadges = document.querySelectorAll('span[data-testid="icon-unread-count"], span[aria-label*="unread"]');
            let totalUnread = 0;
            
            unreadBadges.forEach(badge => {
              const count = parseInt(badge.textContent?.trim() || '0');
              if (!isNaN(count)) {
                totalUnread += count;
              }
            });
            
            // Method 2: Count chats with unread indicators (fallback)
            if (totalUnread === 0) {
              const unreadChats = document.querySelectorAll('[aria-label*="unread message"], [class*="unread"]');
              totalUnread = unreadChats.length;
            }
            
            // Method 3: Check for green dots or badges
            const greenDots = document.querySelectorAll('span[data-icon="unread-count"]');
            if (greenDots.length > 0 && totalUnread === 0) {
              totalUnread = greenDots.length;
            }
            
            console.log(\`[WhatsApp Monitor] 📊 Total unread: \${totalUnread}, Previous: \${previousTotalUnread}, Baseline set: \${baselineSet}\`);
            
            // Check for new messages
            if (baselineSet && totalUnread > previousTotalUnread) {
              const newMessages = totalUnread - previousTotalUnread;
              console.log(\`[WhatsApp Monitor] 🔔🔔🔔 NEW MESSAGES DETECTED! (+\${newMessages})\`);
              
              window.postMessage({
                type: 'NEW_NOTIFICATION',
                payload: {
                  accountId: '${account.id}',
                  accountName: '${account.accountName}',
                  platform: '${account.platform}',
                  count: newMessages,
                }
              }, '*');
              
              console.log('[WhatsApp Monitor] ✅ Notification sent!');
            } else if (!baselineSet) {
              console.log('[WhatsApp Monitor] 📍 Baseline set - ignoring existing messages');
              baselineSet = true;
            } else if (totalUnread === previousTotalUnread) {
              console.log('[WhatsApp Monitor] ℹ️ No change in unread count');
            } else if (totalUnread < previousTotalUnread) {
              console.log('[WhatsApp Monitor] 📉 Unread count decreased (message read)');
            }
            
            previousTotalUnread = totalUnread;
            
          } catch (err) {
            console.error('[WhatsApp Monitor] ❌ Error checking:', err);
          }
        }
        
        // Initial check after 10 seconds (to set baseline)
        setTimeout(() => {
          console.log('[WhatsApp Monitor] 📍 Running initial baseline check...');
          checkForNewMessages();
          
          // Then check every 30 seconds (WhatsApp is more responsive)
          checkInterval = setInterval(checkForNewMessages, 30000);
          console.log('[WhatsApp Monitor] ✅ Now monitoring every 30 seconds (+ MutationObserver for instant detection)');
        }, 10000);
        
        // Use MutationObserver for immediate detection
        const observer = new MutationObserver((mutations) => {
          // Check if any badge or unread indicator was added
          const hasUnreadChange = mutations.some(m => {
            if (m.type === 'childList') {
              return Array.from(m.addedNodes).some(node => {
                if (node instanceof Element) {
                  return node.querySelector?.('span[data-testid="icon-unread-count"]') ||
                         node.querySelector?.('[aria-label*="unread"]') ||
                         node.getAttribute?.('data-testid') === 'icon-unread-count';
                }
                return false;
              });
            }
            return false;
          });
          
          if (hasUnreadChange && baselineSet) {
            console.log('[WhatsApp Monitor] 🔍 Unread indicator detected! Checking...');
            checkForNewMessages();
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
        
        console.log('[WhatsApp Monitor] 🎯 Setup complete - monitoring DOM changes & polling...');
      })();
    `;

    browserWindow.webContents.executeJavaScript(whatsappMonitor).catch(err => {
      console.error('[WhatsApp Monitor] Failed to inject:', err);
    });

    return;
  }

  // For other platforms (Airbnb, etc.) - use DOM monitoring

  // For other platforms (Airbnb, etc.) - use DOM monitoring
  const monitorScript = `
    (function() {
      console.log('[Notification Monitor] Started for ${account.platform} - ${account.accountName}');
      let lastBadgeCount = 0;
      
      function checkNotifications() {
        const selectors = {
          airbnb: [
            '[data-testid="notification-badge"]',
            '.notification-badge',
            '[aria-label*="notification"]',
            '[aria-label*="unread"]',
            '.notification-indicator',
            '[data-notification-count]',
            'button[aria-label*="Notifications"]',
            '[data-testid="main-header-notification-button"]',
          ],
        };
        
        const platformSelectors = selectors['${account.platform}'] || [];
        
        // For Airbnb and other platforms: use text/number count
        for (const selector of platformSelectors) {
          const badges = document.querySelectorAll(selector);
          if (badges.length > 0) {
            badges.forEach(badge => {
              const count = parseInt(badge.textContent?.trim() || badge.getAttribute('data-count') || badge.getAttribute('aria-label')?.match(/\\d+/)?.[0] || '0', 10);
              if (count > lastBadgeCount && count > 0) {
                console.log('[Notification Monitor] New notification detected! Count:', count);
                
                window.postMessage({
                  type: 'NEW_NOTIFICATION',
                  payload: {
                    accountId: '${account.id}',
                    accountName: '${account.accountName}',
                    platform: '${account.platform}',
                    count: count,
                  }
                }, '*');
                
                lastBadgeCount = count;
              }
            });
            break;
          }
        }
        
        // Also check for title changes (common notification pattern)
        const titleMatch = document.title.match(/\\((\\d+)\\)/);
        if (titleMatch) {
          const titleCount = parseInt(titleMatch[1], 10);
          if (titleCount > lastBadgeCount && titleCount > 0) {
            console.log('[Notification Monitor] New notification from title! Count:', titleCount);
            
            window.postMessage({
              type: 'NEW_NOTIFICATION',
              payload: {
                accountId: '${account.id}',
                accountName: '${account.accountName}',
                platform: '${account.platform}',
                count: titleCount,
              }
            }, '*');
            
            lastBadgeCount = titleCount;
          }
        }
      }
      
      // Check every 3 seconds
      setInterval(checkNotifications, 3000);
      
      // Also use MutationObserver for immediate detection
      const observer = new MutationObserver(() => {
        checkNotifications();
      });
      
      observer.observe(document.body, { 
        subtree: true, 
        childList: true, 
        characterData: true,
        attributes: true,
        attributeFilter: ['data-notification-count', 'aria-label', 'class', 'data-count']
      });
      
      // Initial check after page loads
      setTimeout(checkNotifications, 2000);
      
      console.log('[Notification Monitor] Setup complete');
    })();
  `;

  browserWindow.webContents.executeJavaScript(monitorScript).catch(err => {
    console.error('[Notification Monitor] Failed to inject:', err);
  });
}

// Show system notification
function showSystemNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: isDev
        ? path.join(__dirname, "../build/icon.ico")
        : path.join(process.resourcesPath, "build", "icon.ico"),
      silent: false,
    });

    notification.on("click", () => {
      mainWindow?.show();
      mainWindow?.focus();
    });

    notification.show();
  }
}

// Play notification sound
function playNotificationSound() {
  mainWindow?.webContents.send("play-notification-sound");
}

// IPC Handlers
ipcMain.handle("get-browser-accounts", () => {
  return (Array.from(browserSessions.values()) as BrowserAccountSession[]).map((s) => ({
    id: s.id,
    platform: s.platform,
    accountName: s.accountName,
    partition: s.partition,
    isOpen: !!s.window && !s.window.isDestroyed(),
  }));
});

ipcMain.handle("add-browser-account", (_, account: Omit<BrowserAccountSession, "window">) => {
  const accountSession: BrowserAccountSession = {
    ...account,
    window: undefined,
  };
  browserSessions.set(account.id, accountSession);
  saveSessions();
  return { success: true };
});

ipcMain.handle("remove-browser-account", (_, accountId: string) => {
  if (pollingService) {
    pollingService.stopPolling(accountId);
  }
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    account.window.close();
  }
  browserSessions.delete(accountId);
  saveSessions();

  // Clear session data
  const partition = `persist:${account?.partition}`;
  session.fromPartition(partition).clearStorageData();

  return { success: true };
});

ipcMain.handle("open-browser-account", (_, accountData: any) => {
  // Graceful fallback for stale frontend builds that only send the ID
  if (typeof accountData === "string") {
    dialog.showErrorBox(
      "تحديث مطلوب للسيرفر",
      "تم اكتشاف كود قديم قادم من الموقع. السيرفر بتاعك محتاج يتعمله (npm run build) عشان يبعت البيانات كاملة للبرنامج بدل ما يبعت ID فقط (واللي بيخليه يفتح واتساب بالغلط)."
    );
    return { success: false, error: "Stale frontend build detected. Please run npm run build on your server." };
  }

  let account = browserSessions.get(accountData.id);

  // If the account was created remotely and doesn't exist locally, add it
  if (!account) {
    if (!accountData.platform) {
      return { success: false, error: "Invalid account data. Missing platform." };
    }
    const newAccount: BrowserAccountSession = {
      id: accountData.id,
      platform: accountData.platform,
      accountName: accountData.accountName || "Unknown",
      partition: accountData.partition || `persist:fallback-${Date.now()}`,
      createdBy: accountData.createdBy || "system"
    };
    browserSessions.set(accountData.id, newAccount);
    account = newAccount;
    saveSessions(); // Save to local storage so it persists
  }

  // If window exists and not destroyed, focus it
  if (account.window && !account.window.isDestroyed()) {
    account.window.focus();
    notifyTabsChanged();
    return { success: true };
  }

  // Create new window
  account.window = createBrowserWindow(account);
  notifyTabsChanged();

  // STAGE 2: Start health polling for API platforms (reads flow via CDP).
  if (pollingService && (account.platform === 'airbnb' || account.platform === 'gathern')) {
    console.log(`[Main Process] 🚀 Starting health polling for ${account.accountName} (${account.platform})`);
    pollingService.startHealthPolling(account.id);
  }

  return { success: true };
});

ipcMain.handle("close-browser-account", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    account.window.close();
    account.window = undefined;
  }
  notifyTabsChanged();
  return { success: true };
});

ipcMain.handle("open-auth-window", async (_, { platform, accountId, partition }) => {
  console.log(`[Main Process] Opening auth window for ${platform} (${accountId})`);

  // Check if session already exists in memory
  let account = browserSessions.get(accountId);

  if (!account) {
    // If it doesn't exist (e.g. first time authenticating), create a temporary session
    account = {
      id: accountId,
      platform: platform as any,
      accountName: accountId, // Fallback name
      partition: partition || accountId,
      createdBy: "system"
    };
    browserSessions.set(accountId, account);
  }

  // If window exists and not destroyed, focus it
  if (account.window && !account.window.isDestroyed()) {
    account.window.focus();
    return { success: true };
  }

  // Create new window
  account.window = createBrowserWindow(account);

  // Set specific login URL if needed (overriding the default in createBrowserWindow if necessary, 
  // but the defaults in createBrowserWindow are already good starting points)
  const loginUrls = {
    airbnb: "https://www.airbnb.com/login",
    gathern: "https://business.gathern.co/login",
    whatsapp: "https://web.whatsapp.com",
    zomrahub: "https://login.zomrahub.com",
  };

  const url = loginUrls[platform as keyof typeof loginUrls] || account.window.webContents.getURL();
  account.window.loadURL(url);

  notifyTabsChanged();
  return { success: true };
});

// Phase 1.3: Data Retrieval IPC Handlers (Local DB based)
// Shared DB connection helper for main.ts IPC handlers
// __dirname = electron/dist/ → ../../ = project root
async function getMainDbConnection() {
  const envPath = path.join(__dirname, '../../.env');
  const env: any = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    });
  } else {
    console.warn(`[Main DB] .env not found at ${envPath}`);
  }
  return mysql.createConnection({
    host: env['DB_HOST'] || '127.0.0.1',
    port: parseInt(env['DB_PORT'] || '3306'),
    user: env['DB_USER'] || 'root',
    password: env['DB_PASSWORD'] || '',
    database: env['DB_NAME'] || 'rentals_dashboard',
    connectTimeout: 10000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hidden warm-up windows
// Opens a hidden BrowserWindow for Gathern accounts that have no chatAuthToken
// so the request sniffer captures the Bearer token automatically.
// The window is closed after 20 seconds.
// ─────────────────────────────────────────────────────────────────────────────

function warmUpMissingTokens() {
  const gathernWithoutToken = Array.from(browserSessions.values()).filter(
    s => s.platform === 'gathern' && !s.chatAuthToken
  );

  if (gathernWithoutToken.length === 0) {
    console.log('[WarmUp] ✅  All Gathern accounts have tokens — no warm-up needed');
    return;
  }

  console.log(`[WarmUp] 🔥  Starting token warm-up for ${gathernWithoutToken.length} Gathern account(s)`);

  for (const account of gathernWithoutToken) {
    const partition = `persist:${account.partition}`;
    const ses = session.fromPartition(partition, { cache: true });

    const win = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      skipTaskbar: true,
      webPreferences: {
        session: ses,
        preload: path.join(__dirname, 'webview-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    win.loadURL('https://business.gathern.co/app/chat');
    account.window = win;

    // Attach CDP so any chats the Gathern page fetches during warm-up flow
    // into the unified inbox alongside the Bearer-token sniffing.
    let warmHandle: CdpInterceptorHandle | null = null;
    win.webContents.once('dom-ready', () => {
      warmHandle = attachCdpInterceptor(
        win.webContents,
        (url, json) => {
          if (!pollingService) return;
          pollingService
            .processSnapshot(account.id, url, json)
            .catch(() => { /* silent during warm-up */ });
        },
        { label: `warm:${account.accountName}` }
      );
    });

    setTimeout(() => {
      try { warmHandle?.detach(); } catch { /* ignore */ }
      if (!win.isDestroyed()) {
        win.close();
      }
      const s = browserSessions.get(account.id);
      if (s && s.window === win) {
        s.window = undefined;
      }
      console.log(`[WarmUp] 🔒  Closed warm-up window for ${account.accountName}`);
    }, 20_000);

    console.log(`[WarmUp] 🌐  Opened warm-up window for ${account.accountName}`);
  }
}

ipcMain.handle("get-platform-messages", async (_, { accountId, limit = 50 }) => {
    console.log(`[Main] Fetching messages from DB for ${accountId || 'all accounts'}`);
    const connection = await getMainDbConnection();
    try {
        let sql = "SELECT * FROM platform_messages";
        const params: any[] = [];
        if (accountId) {
            sql += " WHERE platform_account_id = ?";
            params.push(accountId);
        }
        sql += " ORDER BY sent_at DESC LIMIT ?";
        params.push(limit);
        const [rows] = await connection.execute(sql, params);
        return { success: true, messages: rows };
    } catch (err: any) {
        console.error("[Main] Failed to fetch messages:", err);
        return { success: false, error: err.message };
    } finally {
        await connection.end();
    }
});

ipcMain.handle("get-session-health-status", async () => {
    const connection = await getMainDbConnection();
    try {
        const [rows]: any = await connection.execute(
            `SELECT browser_account_id as id, status, last_check_at, error_message 
             FROM session_health_logs 
             WHERE id IN (
                 SELECT MAX(id) FROM session_health_logs GROUP BY browser_account_id
             )`
        );
        return rows;
    } catch (err: any) {
        console.error("[Main] Failed to fetch health status:", err);
        return [];
    } finally {
        await connection.end();
    }
});

// Session health — latest log per browser account
ipcMain.handle("get-session-health", async () => {
  const connection = await getMainDbConnection();
  try {
    const [rows]: any = await connection.execute(`
      SELECT shl.browser_account_id, shl.platform, shl.status, shl.error_message, shl.checked_at,
             ba.account_name
      FROM session_health_logs shl
      INNER JOIN (
        SELECT browser_account_id, MAX(checked_at) AS latest
        FROM session_health_logs GROUP BY browser_account_id
      ) lk ON shl.browser_account_id = lk.browser_account_id AND shl.checked_at = lk.latest
      LEFT JOIN browser_accounts ba ON ba.id = shl.browser_account_id
    `);
    return { success: true, health: rows };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    await connection.end();
  }
});

// Browser window controls
ipcMain.handle("browser-go-back", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    account.window.webContents.goBack();
  }
});

ipcMain.handle("browser-go-forward", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    account.window.webContents.goForward();
  }
});

ipcMain.handle("browser-reload", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    account.window.webContents.reload();
  }
});

ipcMain.handle("browser-go-home", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    const platformUrl = account.platform === "airbnb"
      ? "https://www.airbnb.com/hosting/inbox"
      : account.platform === "gathern"
        ? "https://business.gathern.co/app/chat"
        : "https://web.whatsapp.com";
    account.window.webContents.loadURL(platformUrl);
  }
});

// Log from Webview to Terminal
ipcMain.on("webview-log", (event, { msg, type, url }) => {
  const accountId = (Array.from(browserSessions.entries()) as [string, BrowserAccountSession][])
    .find(([, s]) => s.window?.webContents === event.sender)?.[0] || 'Unknown';
    
  const colors = {
    info: '\x1b[36m', // Cyan
    warn: '\x1b[33m', // Yellow
    error: '\x1b[31m', // Red
  };
  const color = colors[type as keyof typeof colors] || colors.info;
  const reset = '\x1b[0m';
  
  console.log(`${color}[Webview Log][${accountId}] ${msg}${reset} (URL: ${url})`);
});

ipcMain.on("new-notification-from-webview", (_, data) => {
  console.log("[Main Process] Received notification from webview:", data);

  const platformName = data.platform === "airbnb" ? "Airbnb" : "Gathern";
  showSystemNotification(
    `إشعار جديد على ${platformName}`,
    `يوجد إشعار جديد على الحساب: ${data.accountName}`
  );
  playNotificationSound();

  mainWindow?.webContents.send("browser-notification", data);
});

// Handle database notifications from renderer
ipcMain.on("database-notification", (_, data: { title: string; body: string; id: string }) => {
  console.log("[Main Process] Received database notification:", data);

  showSystemNotification(data.title, data.body);
  playNotificationSound();

  // Also send to renderer for UI display
  mainWindow?.webContents.send("database-notification", data);
});

// Test notification handler
ipcMain.handle("test-notification", (_, data: any) => {
  console.log("[Main Process] Test notification triggered:", data);
  mainWindow?.webContents.send("browser-notification", data);
  return { success: true };
});

ipcMain.handle("force-platform-sync", async (_, accountId: string) => {
  if (pollingService) {
    await pollingService.syncAccount(accountId);
    return { success: true };
  }
  return { success: false, error: "PollingService not found" };
});

// Get all open tabs (browser windows)
ipcMain.handle("get-open-tabs", () => {
  const openTabs = Array.from(browserSessions.values())
    .filter((s: BrowserAccountSession) => s.window && !s.window.isDestroyed())
    .map((s: BrowserAccountSession) => ({
      id: s.id,
      platform: s.platform,
      accountName: s.accountName,
      title: s.window?.getTitle() || `${s.accountName} - ${s.platform}`,
      url: s.window?.webContents.getURL() || "",
      isFocused: s.window?.isFocused() || false,
    }));
  return openTabs;
});

ipcMain.handle("send-message", async (_, payload: { accountId: string; platform: string; threadId: string; text: string; metadata?: any }) => {
  const account: BrowserAccountSession | undefined = browserSessions.get(payload.accountId);
  if (!account) return { success: false, error: "جلسة الحساب غير موجودة — يرجى فتح واجهة الحساب أولاً" };
  
  try {
    console.log(`[IPC send-message] ▶️ account=${payload.accountId} platform=${payload.platform} thread=${payload.threadId} textLen=${payload.text?.length || 0}`);
    const op = sendPlatformMessage(payload.accountId, payload.threadId, payload.text);
    const ok = await Promise.race([
      op,
      new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Send timed out after 60s')), 60_000)),
    ]);
    console.log(`[IPC send-message] ✅ account=${payload.accountId} thread=${payload.threadId}`);
    return { success: ok };
  } catch(e: any) {
    console.error(`[IPC send-message] ❌ Error:`, e.message);
    return { success: false, error: e.message || "حدث خطأ غير متوقع أثناء الإرسال" };
  }
});

// Focus a specific tab (bring window to front)
ipcMain.handle("focus-tab", (_, accountId: string) => {
  const account = browserSessions.get(accountId);
  if (account?.window && !account.window.isDestroyed()) {
    if (account.window.isMinimized()) {
      account.window.restore();
    }
    account.window.focus();
    account.window.show();
    notifyTabsChanged();
    return { success: true };
  }
  return { success: false, error: "Tab not found or closed" };
});

// App lifecycle
app.whenReady().then(() => {
  const savedSessions = loadSavedSessions();
  savedSessions.forEach((s) => browserSessions.set(s.id, s));

  createMainWindow();
  createTray();

  if (mainWindow) {
    pollingService = new PollingService(mainWindow);
    
    // START POLLING FROM DATABASE (All active accounts)
    console.log(`[Main Process] 📦 Initializing background sync for all database accounts...`);
    pollingService.startPollingFromDB().then(() => {
      // Warm-up: open a hidden window for Gathern accounts that have no Bearer token
      // so the token sniffer can capture it automatically
      warmUpMissingTokens();
    }).catch((err: any) => {
      console.error("[Main Process] ❌ Failed to start DB polling:", err);
    });

    setInterval(() => {
      console.log(`[Polling Heartbeat] Service alive. Monitoring ${browserSessions.size} total sessions.`);
    }, 60000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // On macOS, keep the app running even when all windows are closed
  // On Windows/Linux, quit the app when all windows are closed
  if (process.platform !== "darwin") {
    isAppQuitting = true;
    stopNextServer();
    app.quit();
  }
});

app.on("before-quit", async (event) => {
  isAppQuitting = true;
  stopNextServer();

  // Flush all cookies to disk before quitting
  try {
    // Flush dashboard session cookies
    const dashboardSession = session.fromPartition("persist:dashboard-main");
    await dashboardSession.cookies.flushStore();

    // Flush all browser account session cookies
    browserSessions.forEach((account: BrowserAccountSession) => {
      const partition = `persist:${account.partition}`;
      const ses = session.fromPartition(partition);
      ses.cookies.flushStore().catch((err: any) => {
        console.error(`Error flushing cookies for ${account.accountName}:`, err);
      });
    });
  } catch (err) {
    console.error('Error flushing cookies before quit:', err);
  }

  // Close all browser windows
  browserSessions.forEach((account: BrowserAccountSession) => {
    if (account.window && !account.window.isDestroyed()) {
      account.window.destroy();
    }
  });

  // Clear browser sessions
  browserSessions.clear();
});
