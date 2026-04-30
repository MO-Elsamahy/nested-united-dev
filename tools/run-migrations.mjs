#!/usr/bin/env node
/**
 * Migration runner — applies all pending DB migrations
 * Run with: node scripts/run-migrations.mjs
 */

import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (dotenv is a dependency of the project)
const envPath = join(__dirname, '../.env.local');
if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq < 0) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        if (!process.env[key]) process.env[key] = val;
    }
}

const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rentals_dashboard',
    multipleStatements: false,
});

// ─── Migrations ───────────────────────────────────────────────────────────────

const migrations = [
    {
        name: '1. CRM Deals Stage ENUM — add paid & completed',
        sql: `ALTER TABLE crm_deals
              MODIFY COLUMN stage
              ENUM('new','contacting','qualified','proposal','negotiation','won','paid','completed','lost')
              DEFAULT 'new'`,
    },
    {
        name: '2. CRM Custom Stages — seed paid & completed',
        sql: `INSERT IGNORE INTO crm_custom_stages
              (id, label, stage_key, color, stage_order, is_active, created_at, updated_at)
              VALUES
              (UUID(), 'تم الدفع',  'paid',      'bg-teal-50',    6, 1, NOW(), NOW()),
              (UUID(), 'مكتمل',     'completed', 'bg-emerald-50', 7, 1, NOW(), NOW())`,
    },
    {
        name: '3. Index — hr_attendance (employee_id, date)',
        sql: `ALTER TABLE hr_attendance ADD INDEX idx_attendance_emp_date (employee_id, date)`,
    },
    {
        name: '4. Index — hr_attendance (date)',
        sql: `ALTER TABLE hr_attendance ADD INDEX idx_attendance_date (date)`,
    },
    {
        name: '5. Index — hr_payroll_details (payroll_run_id)',
        sql: `ALTER TABLE hr_payroll_details ADD INDEX idx_payroll_detail_run (payroll_run_id)`,
    },
    {
        name: '6. Index — crm_activities (customer_id)',
        sql: `ALTER TABLE crm_activities ADD INDEX idx_crm_act_customer (customer_id)`,
    },
    {
        name: '7. Index — crm_activities (deal_id)',
        sql: `ALTER TABLE crm_activities ADD INDEX idx_crm_act_deal (deal_id)`,
    },
    {
        name: '8. Index — crm_deals (status, stage)',
        sql: `ALTER TABLE crm_deals ADD INDEX idx_crm_deals_status_stage (status, stage)`,
    },
    {
        name: '11. CRM deals — priority',
        sql: `ALTER TABLE crm_deals ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium'`,
    },
    {
        name: '12. CRM deals — expected_close_date',
        sql: `ALTER TABLE crm_deals ADD COLUMN expected_close_date DATE NULL`,
    },
    {
        name: '9. HR Settings — gosi_employer_rate',
        sql: `INSERT IGNORE INTO hr_settings (id, setting_key, setting_value, description)
              VALUES (UUID(), 'gosi_employer_rate', '12.5', 'نسبة تأمينات صاحب العمل GOSI (%)')`,
    },
    {
        name: '10. HR Settings — gosi_expense_account_id',
        sql: `INSERT IGNORE INTO hr_settings (id, setting_key, setting_value, description)
              VALUES (UUID(), 'gosi_expense_account_id', NULL, 'حساب مصروف GOSI صاحب العمل (اختياري)')`,
    },
    {
        name: '13. HR — payroll run activity log',
        sql: `CREATE TABLE IF NOT EXISTS hr_payroll_run_logs (
            id CHAR(36) NOT NULL PRIMARY KEY,
            payroll_run_id CHAR(36) NOT NULL,
            user_id CHAR(36) NULL,
            action VARCHAR(50) NOT NULL,
            note TEXT NULL,
            meta JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_payroll_run_logs_run (payroll_run_id),
            INDEX idx_payroll_run_logs_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    },
];

// ─── Auto-wire accounting settings ───────────────────────────────────────────

const accountingSettings = [
    {
        key: 'salary_expense_account_id',
        desc: 'حساب مصروف رواتب',
        query: `SELECT id FROM accounting_accounts
                WHERE type LIKE '%expense%'
                  AND (name LIKE '%رات%' OR name LIKE '%salary%' OR name LIKE '%Salary%')
                ORDER BY created_at ASC LIMIT 1`,
        fallback: `SELECT id FROM accounting_accounts
                   WHERE type LIKE '%expense%'
                   ORDER BY created_at ASC LIMIT 1`,
    },
    {
        key: 'salary_payable_account_id',
        desc: 'حساب رواتب مستحقة الدفع',
        query: `SELECT id FROM accounting_accounts
                WHERE (name LIKE '%مستحقة%' OR name LIKE '%payable%' OR name LIKE '%Payable%')
                ORDER BY created_at ASC LIMIT 1`,
        fallback: `SELECT id FROM accounting_accounts
                   WHERE type LIKE '%liabil%'
                   ORDER BY created_at ASC LIMIT 1`,
    },
    {
        key: 'salary_journal_id',
        desc: 'دفتر يومية الرواتب',
        query: `SELECT id FROM accounting_journals
                WHERE (name LIKE '%رات%' OR name LIKE '%salary%' OR name LIKE '%Salary%' OR type = 'salary')
                ORDER BY created_at ASC LIMIT 1`,
        fallback: `SELECT id FROM accounting_journals ORDER BY created_at ASC LIMIT 1`,
    },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

async function run() {
    const conn = await pool.getConnection();
    let passed = 0, skipped = 0, failed = 0;

    console.log('\n══════════════════════════════════════════');
    console.log('  DB Migration Runner — rentals_dashboard ');
    console.log('══════════════════════════════════════════\n');

    for (const m of migrations) {
        try {
            await conn.query(m.sql);
            console.log(`  ✅  ${m.name}`);
            passed++;
        } catch (err) {
            const code = err.errno || '';
            const msg = err.message || String(err);
            // 1060 = Duplicate column, 1061 = Duplicate key, 1050 = Table exists
            if ([1060, 1061, 1050].includes(code) || msg.includes('Duplicate')) {
                console.log(`  ⏩  ${m.name}  (already applied)`);
                skipped++;
            } else {
                console.error(`  ❌  ${m.name}`);
                console.error(`      ${msg}`);
                failed++;
            }
        }
    }

    // ── Auto-wire HR accounting settings ─────────────────────────────────────
    console.log('\n─── HR Accounting Settings ───────────────\n');

    for (const s of accountingSettings) {
        try {
            // Check if already set
            const [existingRows] = await conn.query(
                `SELECT setting_value FROM hr_settings WHERE setting_key = ?`, [s.key]
            );
            const current = existingRows[0]?.setting_value;
            if (current) {
                console.log(`  ⏩  ${s.key} (already set: ${current})`);
                skipped++;
                continue;
            }

            // Try primary query
            let [rows] = await conn.query(s.query);
            if (!rows.length && s.fallback) {
                [rows] = await conn.query(s.fallback);
            }
            const id = rows[0]?.id;

            if (id) {
                await conn.query(
                    `UPDATE hr_settings SET setting_value = ? WHERE setting_key = ?`,
                    [id, s.key]
                );
                console.log(`  ✅  ${s.key} → ${id}  (${s.desc})`);
                passed++;
            } else {
                console.log(`  ⚠️   ${s.key} — no matching account found`);
                console.log(`        أعدّه يدوياً من /settings → إعدادات HR`);
                skipped++;
            }
        } catch (err) {
            console.error(`  ❌  ${s.key}: ${err.message}`);
            failed++;
        }
    }

    console.log('\n══════════════════════════════════════════');
    console.log(`  Done: ${passed} applied, ${skipped} skipped, ${failed} failed`);
    console.log('══════════════════════════════════════════\n');

    conn.release();
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
