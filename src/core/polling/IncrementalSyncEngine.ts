import { Pool } from 'mysql2/promise';
import { ISyncStrategy } from '../interfaces/ISyncEngine';
import { ThreadMetadataRepository } from '../db/repositories/ThreadMetadataRepository';
import { MessageRepository } from '../db/repositories/MessageRepository';
import { AirbnbSyncStrategy } from './strategies/AirbnbSyncStrategy';
import { GathernSyncStrategy } from './strategies/GathernSyncStrategy';
import { GraphQLRegistry } from '../registry/GraphQLRegistry';
import { AdaptiveAPIClient } from '../client/AdaptiveAPIClient';
import { AirbnbThreadParser } from '../parsers/airbnb/AirbnbParsers';
import { GathernThreadParser } from '../parsers/gathern/GathernParsers';
import { PaginationDetector } from '../pagination/PaginationDetector';

export class IncrementalSyncEngine {
  private strategies = new Map<string, ISyncStrategy>();

  constructor(private pool: Pool) {
    this.initializeStrategies();
  }

  private initializeStrategies() {
    const registry = new GraphQLRegistry(this.pool);
    const client = new AdaptiveAPIClient(registry);
    const paginator = new PaginationDetector();

    const airbnbThreadParser = new AirbnbThreadParser();
    const gathernThreadParser = new GathernThreadParser();

    const threadRepo = new ThreadMetadataRepository(this.pool);
    const messageRepo = new MessageRepository(this.pool);

    const airbnbStrategy = new AirbnbSyncStrategy(
      client,
      airbnbThreadParser,
      paginator,
      threadRepo,
      messageRepo
    );

    const gathernStrategy = new GathernSyncStrategy(
      gathernThreadParser,
      paginator,
      threadRepo,
      messageRepo
    );

    this.strategies.set('airbnb', airbnbStrategy);
    this.strategies.set('gathern', gathernStrategy);
  }

  registerStrategy(strategy: ISyncStrategy) {
    this.strategies.set(strategy.platform, strategy);
  }

  async runSyncOnce(): Promise<void> {
    console.log(`\n\x1b[36m[Engine] 🌀 Starting Sync Cycle at ${new Date().toISOString()}\x1b[0m`);
    
    let accounts: any[] = [];
    try {
      const [rows]: any = await this.pool.execute(
        `SELECT * FROM browser_accounts WHERE is_active = 1`
      );
      accounts = rows || [];
    } catch (e: any) {
      console.error(`[Engine] ❌ Failed to fetch active browser accounts:`, e.message);
      return;
    }

    console.log(`[Engine] Found ${accounts.length} active browser accounts`);

    for (const account of accounts) {
      if (account.platform === 'airbnb') {
        console.log(`[Engine] ⏭️ Skipping polling for Airbnb account ${account.id} (Now Event-Driven)`);
        continue;
      }

      const strategy = this.strategies.get(account.platform);
      if (!strategy) {
        console.warn(`[Engine] ⚠️  No synchronization strategy registered for platform: ${account.platform}`);
        continue;
      }

      await this.syncAccount(account, strategy);
    }

    console.log(`\x1b[36m[Engine] 🏁 Sync Cycle completed\x1b[0m\n`);
  }

  private async syncAccount(account: any, strategy: ISyncStrategy): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      // Begin sync execution
      const isInitial = !account.initial_sync_completed;

      if (isInitial) {
        console.log(`[Engine] Account ${account.account_name} (${account.platform}) requires Initial Sync.`);
        await strategy.initialSync(account, connection);
        
        // Mark initial sync complete in DB
        await connection.execute(
          `UPDATE browser_accounts SET initial_sync_completed = 1, last_poll_at = NOW(), poll_error = NULL WHERE id = ?`,
          [account.id]
        );
      } else {
        console.log(`[Engine] Account ${account.account_name} (${account.platform}) running Incremental Sync.`);
        await strategy.incrementalSync(account, connection);
        
        await connection.execute(
          `UPDATE browser_accounts SET last_poll_at = NOW(), poll_error = NULL WHERE id = ?`,
          [account.id]
        );
      }
    } catch (err: any) {
      console.error(`[Engine] ❌ Synchronization failed for account ${account.account_name}:`, err.message);
      
      try {
        await this.pool.execute(
          `UPDATE browser_accounts SET poll_error = ? WHERE id = ?`,
          [err.message.substring(0, 490), account.id]
        );
      } catch (dbErr: any) {
        console.error(`[Engine] Failed to save poll_error to DB:`, dbErr.message);
      }
    } finally {
      connection.release();
    }
  }

  async syncSingleThread(accountId: string, platform: string, threadId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await this.pool.execute(
        `SELECT * FROM browser_accounts WHERE id = ? AND is_active = 1`,
        [accountId]
      );
      if (!rows || rows.length === 0) {
        console.warn(`[Engine] ⚠️ Cannot sync thread: active browser account ${accountId} not found`);
        return;
      }
      const account = rows[0];
      const strategy = this.strategies.get(platform);
      
      if (strategy) {
        if (typeof (strategy as any).syncSingleThread === 'function') {
          await (strategy as any).syncSingleThread(account, threadId, connection);
        } else {
          console.warn(`[Engine] ⚠️ Strategy for ${platform} does not implement syncSingleThread`);
        }
      }
    } catch (err: any) {
      console.error(`[Engine] ❌ syncSingleThread failed for account ${accountId}, thread ${threadId}:`, err.message);
    } finally {
      connection.release();
    }
  }

  async syncSingleAccount(accountId: string): Promise<void> {
    const connection = await this.pool.getConnection();
    try {
      const [rows]: any = await this.pool.execute(
        `SELECT * FROM browser_accounts WHERE id = ? AND is_active = 1`,
        [accountId]
      );
      if (!rows || rows.length === 0) {
        console.warn(`[Engine] ⚠️ Cannot sync account: active browser account ${accountId} not found`);
        return;
      }
      const account = rows[0];
      const strategy = this.strategies.get(account.platform);
      if (!strategy) {
        console.warn(`[Engine] ⚠️ Strategy not found for platform: ${account.platform}`);
        return;
      }
      // Delegate to the private syncAccount method
      await this.syncAccount(account, strategy);
    } catch (err: any) {
      console.error(`[Engine] ❌ syncSingleAccount failed for account ${accountId}:`, err.message);
    } finally {
      connection.release();
    }
  }
}
