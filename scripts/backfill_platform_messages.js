/**
 * Backfill Script: platform_messages
 *
 * Fixes data written by the old code where:
 *   - platform_account_id was actually a browser_accounts.id (not platform_accounts.id)
 *   - browser_account_id was not populated
 *
 * Steps:
 *   1. Copy platform_account_id → browser_account_id for rows where browser_account_id is NULL
 *   2. Look up the real platform_accounts.id via browser_accounts.platform_account_id
 *      and write it back to platform_messages.platform_account_id
 *
 * Run AFTER migrate_2026_04_unified_inbox.js:
 *   node scripts/backfill_platform_messages.js
 */

const mysql = require('mysql2/promise');
const path  = require('path');
const fs    = require('fs');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const eq = t.indexOf('=');
      if (eq > 0) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    });
  }
}
loadEnv();

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306'),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'rentals_dashboard',
};

async function run() {
  console.log('\n🔄  Backfill: platform_messages\n');

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅  Connected:', DB_CONFIG.database, '@', DB_CONFIG.host);

  try {
    // ── Step 1: Copy old platform_account_id → browser_account_id ──────────
    // Old code stored browser_accounts.id in platform_account_id column
    const [step1] = await conn.execute(`
      UPDATE platform_messages
      SET browser_account_id = platform_account_id
      WHERE browser_account_id IS NULL
        AND platform_account_id IS NOT NULL
    `);
    console.log(`\n[Step 1] Copied platform_account_id → browser_account_id: ${step1.affectedRows} rows`);

    // ── Step 2: Fix platform_account_id to point to platform_accounts ────────
    // browser_accounts.platform_account_id holds the real FK to platform_accounts
    const [step2] = await conn.execute(`
      UPDATE platform_messages pm
      INNER JOIN browser_accounts ba ON ba.id = pm.browser_account_id
      SET pm.platform_account_id = ba.platform_account_id
      WHERE ba.platform_account_id IS NOT NULL
        AND (pm.platform_account_id != ba.platform_account_id OR pm.platform_account_id = pm.browser_account_id)
    `);
    console.log(`[Step 2] Fixed platform_account_id from browser_accounts.platform_account_id: ${step2.affectedRows} rows`);

    // ── Step 3: Remove duplicate rows (same browser_account_id + thread_id + platform_msg_id) ─
    // Keep the row with highest id (last inserted)
    const [dups] = await conn.execute(`
      SELECT COUNT(*) AS cnt
      FROM (
        SELECT browser_account_id, thread_id, platform_msg_id, COUNT(*) AS n
        FROM platform_messages
        WHERE platform_msg_id IS NOT NULL
        GROUP BY browser_account_id, thread_id, platform_msg_id
        HAVING n > 1
      ) t
    `);
    const dupCount = dups[0]?.cnt || 0;
    console.log(`\n[Step 3] Duplicate rows to remove: ${dupCount}`);

    if (dupCount > 0) {
      await conn.execute(`
        DELETE pm1
        FROM platform_messages pm1
        INNER JOIN platform_messages pm2
          ON pm1.browser_account_id = pm2.browser_account_id
         AND pm1.thread_id          = pm2.thread_id
         AND pm1.platform_msg_id    = pm2.platform_msg_id
         AND pm1.id < pm2.id
      `);
      console.log(`   ✅  Duplicates removed`);
    }

    // ── Step 4: Report final state ────────────────────────────────────────────
    const [counts] = await conn.execute(`
      SELECT
        COUNT(*)                                                        AS total,
        SUM(browser_account_id IS NOT NULL)                            AS has_ba_id,
        SUM(platform_account_id IS NOT NULL)                           AS has_pa_id,
        SUM(platform_msg_id IS NOT NULL)                               AS has_msg_id,
        COUNT(DISTINCT CONCAT(browser_account_id,'|',thread_id))       AS unique_threads
      FROM platform_messages
    `);
    console.log('\n📊  Final state:');
    console.table(counts);

    console.log('\n🎉  Backfill completed!\n');
  } catch (err) {
    console.error('\n❌  Error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

run();
