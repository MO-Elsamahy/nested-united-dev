import type { PoolConnection } from "mysql2/promise";
import { execute, generateUUID } from "@/lib/db";

const HR_PAYROLL_RUN_LOGS_DDL = `
CREATE TABLE IF NOT EXISTS hr_payroll_run_logs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    payroll_run_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    action VARCHAR(50) NOT NULL,
    note TEXT NULL,
    meta JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payroll_run_logs_run (payroll_run_id),
    INDEX idx_payroll_run_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

let payrollRunLogsTableReady = false;

/** Ensures table exists (idempotent). Safe to call before every log read/write if migrations were not run. */
export async function ensureHrPayrollRunLogsTable(): Promise<void> {
    if (payrollRunLogsTableReady) return;
    await execute(HR_PAYROLL_RUN_LOGS_DDL.replace(/\s+/g, " ").trim());
    payrollRunLogsTableReady = true;
}

export type HrPayrollRunLogAction =
    | "approved"
    | "reverted_approval"
    | "draft_deleted";

export async function insertHrPayrollRunLog(
    params: {
        payrollRunId: string;
        userId: string;
        action: HrPayrollRunLogAction | string;
        note?: string | null;
        meta?: Record<string, unknown> | null;
    },
    conn?: PoolConnection
): Promise<void> {
    await ensureHrPayrollRunLogsTable();
    const { payrollRunId, userId, action, note, meta } = params;
    const sql = `INSERT INTO hr_payroll_run_logs (id, payroll_run_id, user_id, action, note, meta)
         VALUES (?, ?, ?, ?, ?, ?)`;
    const args = [
        generateUUID(),
        payrollRunId,
        userId,
        action,
        note ?? null,
        meta == null ? null : JSON.stringify(meta),
    ];
    if (conn) {
        await conn.execute(sql, args);
    } else {
        await execute(sql, args);
    }
}
