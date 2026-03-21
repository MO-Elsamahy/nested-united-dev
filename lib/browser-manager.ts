import puppeteer from 'puppeteer';
import { query, execute } from '@/lib/db';
import fs from 'fs';
import path from 'path';

interface BrowserAccount {
    id: string;
    account_name: string;
    platform: string;
    user_data_dir?: string;
    ws_endpoint?: string;
    debug_port?: number;
}

export class BrowserManager {
    private static BROWSERS_DIR = path.resolve(process.cwd(), 'browser-data');

    /**
     * launches a persistent browser instance for a specific account
     * This is intended to be run on the server
     */
    static async launchBrowser(accountId: string) {
        // 1. Get account details
        const account = await this.getAccount(accountId);
        if (!account) throw new Error(`Account ${accountId} not found`);

        // 2. Prepare user data directory (Persistent Profile)
        const userDataDir = path.join(this.BROWSERS_DIR, accountId);
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }

        // 3. Launch Puppeteer
        // We use a predefined port range or let Puppeteer pick one. 
        // Letting Puppeteer pick is safer to avoid conflicts, we just save the WS Endpoint.
        console.log(`[BrowserManager] Launching browser for ${account.account_name}...`);

        // Optimize for RAM and Stealth
        const minimalArgs = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Save memory
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1280,720',
            '--disable-blink-features=AutomationControlled' // Stealth
        ];

        const browser = await puppeteer.launch({
            headless: false,
            userDataDir: userDataDir,
            args: minimalArgs,
            defaultViewport: null,
            ignoreDefaultArgs: ['--enable-automation'],
            // Stay open settings - FIX CRASHES
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            timeout: 0,
        });

        const wsEndpoint = browser.wsEndpoint();
        const port = parseInt(new URL(wsEndpoint).port);

        console.log(`[BrowserManager] Launched at ${wsEndpoint}`);

        // 4. Update Database
        await execute(
            `UPDATE browser_accounts 
       SET ws_endpoint = ?, debug_port = ?, user_data_dir = ?, last_connected_at = NOW(), is_active = 1 
       WHERE id = ?`,
            [wsEndpoint, port, userDataDir, accountId]
        );

        // 5. Navigate to platform URL
        try {
            // Get the first page (blank one) instead of creating a new one
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : await browser.newPage();

            // Set User-Agent & Headers (Copied from Electron legacy code to avoid detection)
            const chromeUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            await page.setUserAgent(chromeUserAgent);
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            });

            let url = 'https://google.com';

            // Direct to Chat/Inbox pages (From Electron legacy code)
            if (account.platform === 'airbnb') url = 'https://www.airbnb.com/hosting/inbox';
            if (account.platform === 'gathern') url = 'https://business.gathern.co/app/chat';
            if (account.platform === 'whatsapp') url = 'https://web.whatsapp.com';
            if (account.platform === 'zomrahub') url = 'https://login.zomrahub.com';

            console.log(`[BrowserManager] Navigating to ${url}...`);
            await page.goto(url, { waitUntil: 'domcontentloaded' });

        } catch (err) {
            console.error("[BrowserManager] Error navigating to platform:", err);
        }

        return { browser, wsEndpoint };
    }

    /**
     * Connects to an existing running browser request
     */
    static async connectToBrowser(accountId: string) {
        const account = await this.getAccount(accountId);
        if (!account || !account.ws_endpoint) {
            // If not running, verify if we should launch it? 
            // For now, let's assume we strictly connect, or fail.
            // The API route can decide to launch if connect fails.
            return null;
        }

        try {
            const browser = await puppeteer.connect({
                browserWSEndpoint: account.ws_endpoint,
                defaultViewport: null
            });
            return browser;
        } catch (error) {
            console.warn(`[BrowserManager] Failed to connect to ${accountId}:`, error);
            // Connection failed (maybe browser closed). Update DB to reflect this.
            await execute('UPDATE browser_accounts SET is_active = 0 WHERE id = ?', [accountId]);
            return null;
        }
    }

    /**
     * Helper to get account from DB
     */
    private static async getAccount(accountId: string): Promise<BrowserAccount | null> {
        const results = await query<BrowserAccount>(
            'SELECT id, account_name, platform, user_data_dir, ws_endpoint, debug_port FROM browser_accounts WHERE id = ?',
            [accountId]
        );
        return results[0] || null;
    }
}
