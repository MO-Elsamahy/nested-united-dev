import * as mysql from 'mysql2/promise';
import * as path from 'path';
import * as fs from 'fs';
import { IncrementalSyncEngine } from '../src/core/polling/IncrementalSyncEngine';
import { FallbackManager } from '../src/core/client/FallbackManager';

// Load environment variables
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach((line: string) => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim();
      });
    }
  } catch {}
  return env;
}

const env = loadEnv();
const DB_HOST = env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(env.DB_PORT || '3306', 10);
const DB_USER = env.DB_USER || 'root';
const DB_PASS = env.DB_PASSWORD || '';
const DB_NAME = env.DB_NAME || 'rentals_dashboard';

async function run() {
  console.log(`\x1b[36m[SyncService] 🚀 Starting Enterprise Inbox Sync Service...\x1b[0m`);
  console.log(`[SyncService] Connecting to database ${DB_NAME} at ${DB_HOST}:${DB_PORT}...`);

  const pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const engine = new IncrementalSyncEngine(pool);
  const manager = new FallbackManager(pool, engine);

  console.log(`[SyncService] Starting Fallback Manager (WebSocket priority + incremental polling)...`);
  await manager.start();

  const shutdown = async (signal: string) => {
    console.log(`\n[SyncService] 🛑 Received ${signal}. Shutting down gracefully...`);
    await manager.stop();
    await pool.end();
    console.log(`[SyncService] 👋 Graceful shutdown complete. Exiting.`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // Keep script alive
  console.log(`[SyncService] 🚀 Service is running and listening.`);
}

run().catch(err => {
  console.error(`[SyncService] ❌ Fatal error in sync service:`, err);
  process.exit(1);
});
