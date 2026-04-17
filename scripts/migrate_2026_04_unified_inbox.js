/**
 * Migration: 2026-04 Unified Inbox Schema
 *
 * Brings the local DB in sync with rentals_dashboard.sql (server export).
 * Safe to run multiple times (idempotent).
 *
 * Run: node scripts/migrate_2026_04_unified_inbox.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// ─────────────────────────────────────────────
// Load .env manually (no dotenv dependency)
// ─────────────────────────────────────────────
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
  multipleStatements: true,
};

// ─────────────────────────────────────────────
// Safe ALTER helper – ignores duplicate column/key errors
// ─────────────────────────────────────────────
async function safeAlter(conn, sql, label) {
  try {
    await conn.execute(sql);
    console.log(`   ✅ ${label}`);
  } catch (err) {
    if ([1060, 1061, 1062, 1091].includes(err.errno)) {
      console.log(`   ⏭️  Skipped (already exists): ${label}`);
    } else {
      console.warn(`   ⚠️  ${label} — ${err.message}`);
    }
  }
}

// ─────────────────────────────────────────────
// Check if a column exists
// ─────────────────────────────────────────────
async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

// ─────────────────────────────────────────────
// Check if an index exists
// ─────────────────────────────────────────────
async function indexExists(conn, table, index) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, index]
  );
  return rows[0].cnt > 0;
}

// ─────────────────────────────────────────────
// Main migration
// ─────────────────────────────────────────────
async function migrate() {
  console.log('\n🚀  Unified Inbox Schema Migration — 2026-04\n');

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅  Connected to DB:', DB_CONFIG.database, '@', DB_CONFIG.host);

  try {
    // ══════════════════════════════════════════
    // 1. browser_accounts — add token columns
    // ══════════════════════════════════════════
    console.log('\n📦  [1] browser_accounts — add token columns');

    const baAlters = [
      ["ALTER TABLE browser_accounts ADD COLUMN auth_token      VARCHAR(2000) NULL AFTER is_active",      "auth_token"],
      ["ALTER TABLE browser_accounts ADD COLUMN chat_auth_token VARCHAR(2000) NULL AFTER auth_token",     "chat_auth_token"],
      ["ALTER TABLE browser_accounts ADD COLUMN platform_user_id VARCHAR(255) NULL AFTER chat_auth_token","platform_user_id"],
      ["ALTER TABLE browser_accounts ADD COLUMN last_sync_at    DATETIME     NULL",                       "last_sync_at"],
    ];
    for (const [sql, label] of baAlters) await safeAlter(conn, sql, label);

    // ══════════════════════════════════════════
    // 2. platform_messages — full schema upgrade
    // ══════════════════════════════════════════
    console.log('\n📦  [2] platform_messages — upgrade columns');

    const pmAlters = [
      ["ALTER TABLE platform_messages ADD COLUMN browser_account_id VARCHAR(255)  NULL AFTER platform_account_id", "browser_account_id"],
      ["ALTER TABLE platform_messages ADD COLUMN platform_msg_id   VARCHAR(255)  NULL AFTER thread_id",           "platform_msg_id"],
      ["ALTER TABLE platform_messages ADD COLUMN sender_name       VARCHAR(255)  NULL AFTER guest_name",          "sender_name"],
      ["ALTER TABLE platform_messages ADD COLUMN is_from_me        TINYINT(1)   NOT NULL DEFAULT 0 AFTER message_text", "is_from_me"],
      ["ALTER TABLE platform_messages ADD COLUMN timestamp         DATETIME     NULL AFTER sent_at",              "timestamp"],
    ];
    for (const [sql, label] of pmAlters) await safeAlter(conn, sql, label);

    // Backfill browser_account_id from old platform_account_id where missing
    const hasOldData = await columnExists(conn, 'platform_messages', 'browser_account_id');
    if (hasOldData) {
      const [upd] = await conn.execute(
        `UPDATE platform_messages
         SET browser_account_id = platform_account_id
         WHERE browser_account_id IS NULL AND platform_account_id IS NOT NULL`
      );
      if (upd.affectedRows > 0) {
        console.log(`   ✅  Backfilled browser_account_id for ${upd.affectedRows} rows`);
      }
    }

    // PRIMARY KEY — add only if missing (table may have been created without one)
    const [pkRows] = await conn.execute(
      `SELECT COUNT(*) AS cnt FROM information_schema.table_constraints
       WHERE table_schema = DATABASE() AND table_name = 'platform_messages'
       AND constraint_type = 'PRIMARY KEY'`
    );
    if (pkRows[0].cnt === 0) {
      await safeAlter(
        conn,
        `ALTER TABLE platform_messages MODIFY id VARCHAR(255) NOT NULL, ADD PRIMARY KEY (id)`,
        'PRIMARY KEY on id'
      );
    } else {
      console.log('   ⏭️  Skipped (already exists): PRIMARY KEY');
    }

    // UNIQUE KEY for ON DUPLICATE KEY UPDATE — drop stale keys first
    const staleKeys = ['unique_msg', 'uk_msg'];
    for (const k of staleKeys) {
      if (await indexExists(conn, 'platform_messages', k)) {
        await safeAlter(conn, `ALTER TABLE platform_messages DROP INDEX \`${k}\``, `Drop stale key ${k}`);
      }
    }
    if (!(await indexExists(conn, 'platform_messages', 'uk_thread_msg'))) {
      // Allow NULL in platform_msg_id, so we only add UNIQUE when not null
      await safeAlter(
        conn,
        `ALTER TABLE platform_messages ADD UNIQUE KEY uk_thread_msg (browser_account_id, thread_id, platform_msg_id)`,
        'UNIQUE KEY uk_thread_msg'
      );
    } else {
      console.log('   ⏭️  Skipped (already exists): UNIQUE KEY uk_thread_msg');
    }

    // Performance indexes
    const idxPm = [
      ['idx_pm_sent_at',  'ALTER TABLE platform_messages ADD INDEX idx_pm_sent_at (sent_at)'],
      ['idx_pm_thread',   'ALTER TABLE platform_messages ADD INDEX idx_pm_thread  (thread_id)'],
      ['idx_pm_ba',       'ALTER TABLE platform_messages ADD INDEX idx_pm_ba      (browser_account_id)'],
      ['idx_pm_platform', 'ALTER TABLE platform_messages ADD INDEX idx_pm_platform (platform)'],
    ];
    for (const [name, sql] of idxPm) {
      if (!(await indexExists(conn, 'platform_messages', name))) {
        await safeAlter(conn, sql, name);
      } else {
        console.log(`   ⏭️  Skipped (already exists): ${name}`);
      }
    }

    // ══════════════════════════════════════════
    // 3. session_health_logs — canonical schema
    // ══════════════════════════════════════════
    console.log('\n📦  [3] session_health_logs — ensure canonical schema');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS session_health_logs (
        id            VARCHAR(255)                        NOT NULL,
        browser_account_id VARCHAR(255)                  NOT NULL,
        platform      ENUM('airbnb','gathern')            NOT NULL,
        status        ENUM('healthy','expired','error')   NOT NULL,
        error_message TEXT                                DEFAULT NULL,
        checked_at    TIMESTAMP                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_shl_ba (browser_account_id),
        INDEX idx_shl_checked (checked_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅  session_health_logs ensured');

    // Add checked_at if table existed with old column name
    if (!(await columnExists(conn, 'session_health_logs', 'checked_at'))) {
      await safeAlter(
        conn,
        `ALTER TABLE session_health_logs ADD COLUMN checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        'checked_at on session_health_logs'
      );
    }

    // ══════════════════════════════════════════
    // 4. platform_thread_metadata — new table
    //    stores unit_id + reservation_id per thread
    //    so reply can find the correct unit
    // ══════════════════════════════════════════
    console.log('\n📦  [4] platform_thread_metadata — create if not exists');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS platform_thread_metadata (
        id                 CHAR(36)      NOT NULL DEFAULT (UUID()),
        browser_account_id VARCHAR(255)  NOT NULL,
        thread_id          VARCHAR(255)  NOT NULL,
        platform           ENUM('airbnb','gathern') NOT NULL,
        unit_id            VARCHAR(255)  NULL,
        chalet_id          VARCHAR(255)  NULL,
        reservation_id     VARCHAR(255)  NULL,
        guest_name         VARCHAR(255)  NULL,
        last_read_msg_id   VARCHAR(255)  NULL,
        updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_ptm_thread (browser_account_id, thread_id),
        INDEX idx_ptm_ba (browser_account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅  platform_thread_metadata ensured');

    // ══════════════════════════════════════════
    // 5. Populate thread metadata from raw_data
    //    (best-effort, may not always have unit info)
    // ══════════════════════════════════════════
    console.log('\n📦  [5] Populate platform_thread_metadata from existing raw_data...');

    await conn.execute(`
      INSERT IGNORE INTO platform_thread_metadata (id, browser_account_id, thread_id, platform, unit_id, chalet_id, reservation_id, guest_name)
      SELECT
        UUID(),
        browser_account_id,
        thread_id,
        platform,
        JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.unit_id'))      AS unit_id,
        JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.chalet_id'))    AS chalet_id,
        JSON_UNQUOTE(JSON_EXTRACT(raw_data, '$.reservation_id')) AS reservation_id,
        guest_name
      FROM platform_messages
      WHERE browser_account_id IS NOT NULL
        AND raw_data IS NOT NULL
        AND JSON_VALID(raw_data) = 1
      GROUP BY browser_account_id, thread_id
    `);
    console.log('   ✅  platform_thread_metadata seeded from raw_data');

    console.log('\n🎉  Migration completed successfully!\n');

  } catch (err) {
    console.error('\n❌  Fatal migration error:', err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();
