import { query } from "@/lib/db";

export type AccountingDashboardStats = {
    as_of_date: string;
    /** خزينة/صندوق — حسابات asset_bank ذات account_subtype = 'cash' */
    cash: number;
    /** بنك — حسابات asset_bank ذات account_subtype = 'bank' */
    bank: number;
    /** ذمم مدينة (عملاء) */
    receivables: number;
    /** ذمم دائنة (موردين — liability_payable) */
    payables: number;
};

/**
 * أرصدة مُجمّعة من قيود محاسبية مرحّلة حتى تاريخ معيّن.
 *
 * منطق التصنيف (حسابات البنك):
 *  1. إذا كان العمود account_subtype موجوداً → يُستخدم مباشرةً (cash / bank)
 *  2. إذا لم يكن موجوداً (قبل التطبيق) → يتم التصنيف بالاسم (fallback)
 */
export async function getAccountingDashboardStats(asOfDate?: string): Promise<AccountingDashboardStats> {
    const as_of_date = asOfDate || new Date().toISOString().split("T")[0];

    // ─── SQL يعتمد على account_subtype ───────────────────────────────────────
    const sqlWithSubtype = `
        SELECT
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_bank' AND a.account_subtype = 'cash'
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS cash,
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_bank' AND (a.account_subtype = 'bank' OR a.account_subtype IS NULL)
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS bank,
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_receivable'
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS receivables,
            COALESCE(SUM(CASE
                WHEN a.type = 'liability_payable'
                    OR (a.type = 'liability_current' AND (
                        a.name LIKE '%مورد%'
                        OR LOWER(a.name) LIKE '%supplier%'
                        OR LOWER(a.name) LIKE '%payable%'
                    ))
                THEN ml.credit - ml.debit ELSE 0 END), 0) AS payables
        FROM accounting_move_lines ml
        INNER JOIN accounting_moves m ON ml.move_id = m.id
        INNER JOIN accounting_accounts a ON ml.account_id = a.id
        WHERE m.state = 'posted'
          AND m.deleted_at IS NULL
          AND m.date <= ?
          AND a.deleted_at IS NULL`;

    // ─── SQL احتياطي يعتمد على الاسم (قبل إضافة account_subtype) ─────────────
    const cashNameCond = `(
            a.name LIKE '%صندوق%'
            OR a.name LIKE '%نقد%'
            OR a.name LIKE '%نقدية%'
            OR a.name LIKE '%خزينة%'
            OR LOWER(a.name) LIKE '%cash%'
            OR LOWER(a.name) LIKE '%petty%'
        )`;

    const sqlNameFallback = `
        SELECT
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_bank' AND ${cashNameCond}
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS cash,
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_bank' AND NOT ${cashNameCond}
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS bank,
            COALESCE(SUM(CASE
                WHEN a.type = 'asset_receivable'
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS receivables,
            COALESCE(SUM(CASE
                WHEN a.type = 'liability_payable'
                    OR (a.type = 'liability_current' AND (
                        a.name LIKE '%مورد%'
                        OR LOWER(a.name) LIKE '%supplier%'
                        OR LOWER(a.name) LIKE '%payable%'
                    ))
                THEN ml.credit - ml.debit ELSE 0 END), 0) AS payables
        FROM accounting_move_lines ml
        INNER JOIN accounting_moves m ON ml.move_id = m.id
        INNER JOIN accounting_accounts a ON ml.account_id = a.id
        WHERE m.state = 'posted'
          AND m.deleted_at IS NULL
          AND m.date <= ?`;

    let rows: { cash: number; bank: number; receivables: number; payables: number }[];

    // نحاول أولاً الـ SQL الذي يعتمد على account_subtype
    // لو فشل (مثلاً العمود غير موجود بعد في بيئة معيّنة) نرجع للـ fallback
    try {
        rows = await query<{ cash: number; bank: number; receivables: number; payables: number }>(
            sqlWithSubtype,
            [as_of_date]
        );
    } catch {
        rows = await query<{ cash: number; bank: number; receivables: number; payables: number }>(
            sqlNameFallback,
            [as_of_date]
        );
    }

    const r = rows?.[0] || {};
    return {
        as_of_date,
        cash: Number(r.cash) || 0,
        bank: Number(r.bank) || 0,
        receivables: Number(r.receivables) || 0,
        payables: Number(r.payables) || 0,
    };
}
