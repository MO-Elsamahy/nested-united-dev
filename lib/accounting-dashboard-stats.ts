import { query } from "@/lib/db";

export type AccountingDashboardStats = {
    as_of_date: string;
    /** صناديق / نقدية (حسابات بنكية تُصنّف كصندوق أو نقد حسب الاسم) */
    cash: number;
    /** بنوك (باقي حسابات asset_bank) */
    bank: number;
    /** ذمم مدينة (عملاء) */
    receivables: number;
    /** ذمم دائنة (موردين — liability_payable) */
    payables: number;
};

/**
 * أرصدة مُجمّعة من قيود محاسبية مرحّلة حتى تاريخ معيّن (شبيه بمنطق الميزانية).
 */
export async function getAccountingDashboardStats(asOfDate?: string): Promise<AccountingDashboardStats> {
    const as_of_date = asOfDate || new Date().toISOString().split("T")[0];

    const cashNameCond = `(
            a.name LIKE '%صندوق%'
            OR a.name LIKE '%نقد%'
            OR a.name LIKE '%نقدية%'
            OR LOWER(a.name) LIKE '%cash%'
            OR LOWER(a.name) LIKE '%petty%'
        )`;

    const payablesCond = `(
            a.type = 'liability_payable'
            OR (a.type = 'liability_current' AND (
                a.name LIKE '%مورد%'
                OR LOWER(a.name) LIKE '%supplier%'
                OR LOWER(a.name) LIKE '%payable%'
            ))
        )`;

    const sqlWithAccountDeleted = `SELECT
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
                WHEN ${payablesCond}
                THEN ml.credit - ml.debit ELSE 0 END), 0) AS payables
         FROM accounting_move_lines ml
         INNER JOIN accounting_moves m ON ml.move_id = m.id
         INNER JOIN accounting_accounts a ON ml.account_id = a.id
         WHERE m.state = 'posted'
           AND m.deleted_at IS NULL
           AND m.date <= ?
           AND a.deleted_at IS NULL`;

    const sqlNoAccountDeleted = sqlWithAccountDeleted.replace(" AND a.deleted_at IS NULL", "");

    let rows: { cash: number; bank: number; receivables: number; payables: number }[];
    try {
        rows = await query<{ cash: number, bank: number, receivables: number, payables: number }>(sqlWithAccountDeleted, [as_of_date]);
    } catch {
        rows = await query<{ cash: number, bank: number, receivables: number, payables: number }>(sqlNoAccountDeleted, [as_of_date]);
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
