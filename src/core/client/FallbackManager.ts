import { Pool } from 'mysql2/promise';
import { IncrementalSyncEngine } from '../polling/IncrementalSyncEngine';
import { AirbnbWebSocketListener } from '../websocket/AirbnbWebSocketListener';

export interface TrackedAccount {
  id: string;
  platform: string;
  lastCookies: string;
  wsListener: AirbnbWebSocketListener | null;
  wsStatus: 'connected' | 'disconnected' | 'disabled';
  pollTimer: NodeJS.Timeout | null;
}

export class FallbackManager {
  private trackedAccounts = new Map<string, TrackedAccount>();
  private discoveryTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Configuration options
  private pollIntervalStandard = parseInt(process.env.POLL_INTERVAL_STANDARD || '5000', 10); // 5 seconds
  private pollIntervalSafety = parseInt(process.env.POLL_INTERVAL_SAFETY || '900000', 10);     // 15 minutes
  private discoveryInterval = parseInt(process.env.DISCOVERY_INTERVAL || '30000', 10);        // 30 seconds

  constructor(
    private pool: Pool,
    private engine: IncrementalSyncEngine
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[FallbackManager] 🚀 Starting Fallback Manager...`);

    // Run discovery immediately, then on interval
    await this.reconcileAccounts();
    this.discoveryTimer = setInterval(() => {
      this.reconcileAccounts().catch(err => {
        console.error(`[FallbackManager] ❌ Reconcile error:`, err.message);
      });
    }, this.discoveryInterval);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    console.log(`[FallbackManager] 🛑 Stopping Fallback Manager...`);

    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }

    for (const accountId of this.trackedAccounts.keys()) {
      await this.teardownAccount(accountId);
    }
    this.trackedAccounts.clear();
  }

  private async reconcileAccounts(): Promise<void> {
    let activeAccounts: any[] = [];
    try {
      const [rows]: any = await this.pool.execute(
        `SELECT * FROM browser_accounts WHERE is_active = 1`
      );
      activeAccounts = rows || [];
    } catch (e: any) {
      console.error(`[FallbackManager] ❌ Failed to fetch active accounts:`, e.message);
      return;
    }

    const currentIds = new Set<string>();

    for (const account of activeAccounts) {
      currentIds.add(account.id);
      const tracked = this.trackedAccounts.get(account.id);

      if (!tracked) {
        // ── 1. New active account discovered ──
        await this.setupAccount(account);
      } else if (tracked.lastCookies !== account.cookies_json) {
        // ── 2. Cookies updated: restart listener ──
        console.log(`[FallbackManager] 🔄 Cookies changed for ${account.account_name}. Restarting WebSocket...`);
        await this.teardownAccount(account.id);
        await this.setupAccount(account);
      }
    }

    // ── 3. Clean up deactivated accounts ──
    for (const trackedId of this.trackedAccounts.keys()) {
      if (!currentIds.has(trackedId)) {
        console.log(`[FallbackManager] 🗑️ Account ${trackedId} no longer active. Tearing down...`);
        await this.teardownAccount(trackedId);
        this.trackedAccounts.delete(trackedId);
      }
    }
  }

  private async setupAccount(account: any): Promise<void> {
    console.log(`[FallbackManager] 📦 Setting up account: ${account.account_name} (${account.platform})`);
    const tracked: TrackedAccount = {
      id: account.id,
      platform: account.platform,
      lastCookies: account.cookies_json,
      wsListener: null,
      wsStatus: 'disconnected',
      pollTimer: null
    };

    this.trackedAccounts.set(account.id, tracked);

    if (account.platform === 'airbnb') {
      console.log(`[FallbackManager] ⏭️ Skipping polling setup for Airbnb account ${account.id} (Now Event-Driven)`);
      return;
    }

    // Schedule the initial polling loop based on current status
    this.schedulePolling(tracked);
  }

  private async teardownAccount(accountId: string): Promise<void> {
    const tracked = this.trackedAccounts.get(accountId);
    if (!tracked) return;

    if (tracked.pollTimer) {
      clearTimeout(tracked.pollTimer);
      tracked.pollTimer = null;
    }

    if (tracked.wsListener) {
      await tracked.wsListener.stop();
      tracked.wsListener = null;
    }
  }

  private schedulePolling(tracked: TrackedAccount): void {
    if (tracked.pollTimer) {
      clearTimeout(tracked.pollTimer);
    }

    // Determine poll interval based on platform and WebSocket connection state
    let interval = this.pollIntervalStandard;
    if (tracked.platform === 'airbnb' && tracked.wsStatus === 'connected') {
      interval = this.pollIntervalSafety;
    }

    // Add a small randomized jitter (up to 5 seconds) to spread the server requests
    const jitter = Math.random() * 5000;
    const finalInterval = interval + jitter;

    tracked.pollTimer = setTimeout(async () => {
      console.log(`\n[FallbackManager] ⏰ Timer fired. Executing poll for account ${tracked.id} (${tracked.platform})...`);
      try {
        await this.engine.syncSingleAccount(tracked.id);
      } catch (err: any) {
        console.error(`[FallbackManager] ❌ Polling execution failed for account ${tracked.id}:`, err.message);
      }
      // Re-schedule next poll recursively
      this.schedulePolling(tracked);
    }, finalInterval);
  }

  private handleWebSocketEvent(accountId: string, event: any): void {
    const tracked = this.trackedAccounts.get(accountId);
    if (!tracked) return;

    if (event.type === 'status_change') {
      const oldStatus = tracked.wsStatus;
      tracked.wsStatus = event.status;
      
      if (oldStatus !== event.status) {
        console.log(`[FallbackManager] 🔌 WS connection status for account ${accountId} shifted: ${oldStatus} ──> ${event.status}`);
        // Readjust polling scheduler immediately
        this.schedulePolling(tracked);
      }
    } else if (event.type === 'message') {
      if (event.threadId) {
        console.log(`[FallbackManager] 📨 WS push event: Thread ${event.threadId} changed. Triggering targeted thread sync...`);
        this.engine.syncSingleThread(accountId, 'airbnb', event.threadId).catch(err => {
          console.error(`[FallbackManager] ❌ Targeted thread sync failed:`, err.message);
        });
      } else {
        console.log(`[FallbackManager] 📨 WS push event: General update. Syncing full account inbox...`);
        this.engine.syncSingleAccount(accountId).catch(err => {
          console.error(`[FallbackManager] ❌ Account-level sync failed:`, err.message);
        });
      }
    } else if (event.type === 'error') {
      console.warn(`[FallbackManager] ⚠️ WS error for account ${accountId}:`, event.error);
    }
  }
}

