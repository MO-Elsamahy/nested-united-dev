import { query } from "@/lib/db";

export type AccountingDashboardStats = {
    as_of_date: string;
    /** خزينة/صندوق — حسابات asset_bank ذات account_subtype = 'cash' */
    cash: number;
    /** بنك — حسابات asset_bank ذات account_subtype = 'bank' */
    bank: number;
    /** ذمم مدينة (عملاء) — من جدول الفواتير مباشرة */
    receivables: number;
    /** ذمم دائنة (موردين) — من جدول الفواتير مباشرة */
    payables: number;
};

/**
 * أرصدة الداشبورد المالية — نسخة محصّنة.
 *
 * منطق الحساب:
 *  - الخزينة / البنك: من قيود اليومية لحسابات asset_bank،
 *    مع استبعاد قيود السندات (Payment: ...) التي تكون فواتيرها محذوفة أو مسودة.
 *    هذا يمنع تضخم الخزينة بسبب سندات أُنشئت لفواتير لم تُؤكَّد بعد.
 *
 *  - مستحقات العملاء: SUM(amount_due) من الفواتير المؤكدة فقط (posted / partial)
 *    → مصدر مباشر من جدول الفواتير، لا يتأثر بمشاكل القيود.
 *
 *  - مستحقات الموردين: نفس المنطق لفواتير الموردين.
 */
export async function getAccountingDashboardStats(asOfDate?: string): Promise<AccountingDashboardStats> {
    const as_of_date = asOfDate || new Date().toISOString().split("T")[0];

    // ─── 1. الخزينة / البنك ───────────────────────────────────────────────────
    // نستبعد قيود السندات (Payment: ...) المرتبطة بفواتير غير مؤكدة
    // لأن تلك السندات تضخّم الرصيد دون أن يقابلها فاتورة فعلية.
    const sqlCashBank = `
        SELECT
            COALESCE(SUM(CASE
                WHEN a.account_subtype = 'cash'
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS cash,
            COALESCE(SUM(CASE
                WHEN a.account_subtype = 'bank' OR a.account_subtype IS NULL
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS bank
        FROM accounting_move_lines ml
        INNER JOIN accounting_moves m ON ml.move_id = m.id
        INNER JOIN accounting_accounts a ON ml.account_id = a.id
        WHERE m.state = 'posted'
          AND m.deleted_at IS NULL
          AND m.date <= ?
          AND a.deleted_at IS NULL
          AND a.type = 'asset_bank'
          AND (
            /* 
              استبعاد قيود السندات المرتبطة بفواتير غير مؤكدة:
              إذا كان المرجع يبدأ بـ "Payment:" نتأكد أن السند له فاتورة مؤكدة.
              أما القيود المباشرة (غير مرتبطة بسندات) فتُحسب دائماً.
            */
            m.ref NOT LIKE 'Payment: %'
            OR EXISTS (
              SELECT 1
              FROM accounting_payments p
              INNER JOIN accounting_payment_allocations pa ON p.id = pa.payment_id
              INNER JOIN accounting_invoices i ON pa.invoice_id = i.id
              WHERE p.deleted_at IS NULL
                AND i.deleted_at IS NULL
                AND i.state IN ('posted', 'partial', 'paid', 'confirmed')
                AND m.ref = CONCAT('Payment: ', p.payment_number)
            )
          )`;

    // ─── Fallback إذا لم يكن account_subtype موجوداً ─────────────────────────
    const cashNameCond = `(
            a.name LIKE '%صندوق%'
            OR a.name LIKE '%نقد%'
            OR a.name LIKE '%نقدية%'
            OR a.name LIKE '%خزينة%'
            OR LOWER(a.name) LIKE '%cash%'
            OR LOWER(a.name) LIKE '%petty%'
        )`;

    const sqlCashBankFallback = `
        SELECT
            COALESCE(SUM(CASE
                WHEN ${cashNameCond}
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS cash,
            COALESCE(SUM(CASE
                WHEN NOT ${cashNameCond}
                THEN ml.debit - ml.credit ELSE 0 END), 0) AS bank
        FROM accounting_move_lines ml
        INNER JOIN accounting_moves m ON ml.move_id = m.id
        INNER JOIN accounting_accounts a ON ml.account_id = a.id
        WHERE m.state = 'posted'
          AND m.deleted_at IS NULL
          AND m.date <= ?
          AND a.type = 'asset_bank'
          AND (
            m.ref NOT LIKE 'Payment: %'
            OR EXISTS (
              SELECT 1
              FROM accounting_payments p
              INNER JOIN accounting_payment_allocations pa ON p.id = pa.payment_id
              INNER JOIN accounting_invoices i ON pa.invoice_id = i.id
              WHERE p.deleted_at IS NULL
                AND i.deleted_at IS NULL
                AND i.state IN ('posted', 'partial', 'paid', 'confirmed')
                AND m.ref = CONCAT('Payment: ', p.payment_number)
            )
          )`;

    // ─── 2. مستحقات العملاء (من جدول الفواتير مباشرة) ───────────────────────
    const sqlReceivables = `
        SELECT COALESCE(SUM(amount_due), 0) AS receivables
        FROM accounting_invoices
        WHERE deleted_at IS NULL
          AND invoice_type = 'customer_invoice'
          AND state IN ('posted', 'partial', 'confirmed')
          AND invoice_date <= ?`;

    // ─── 3. مستحقات الموردين (من جدول الفواتير مباشرة) ─────────────────────
    const sqlPayables = `
        SELECT COALESCE(SUM(amount_due), 0) AS payables
        FROM accounting_invoices
        WHERE deleted_at IS NULL
          AND invoice_type IN ('supplier_bill', 'vendor_bill')
          AND state IN ('posted', 'partial', 'confirmed')
          AND invoice_date <= ?`;

    // ─── تنفيذ الاستعلامات ───────────────────────────────────────────────────
    let cashBankRows: { cash: number; bank: number }[];
    let receivablesRows: { receivables: number }[];
    let payablesRows: { payables: number }[];

    try {
        cashBankRows = await query<{ cash: number; bank: number }>(sqlCashBank, [as_of_date]);
    } catch {
        cashBankRows = await query<{ cash: number; bank: number }>(sqlCashBankFallback, [as_of_date]);
    }

    try {
        receivablesRows = await query<{ receivables: number }>(sqlReceivables, [as_of_date]);
    } catch {
        receivablesRows = [{ receivables: 0 }];
    }

    try {
        payablesRows = await query<{ payables: number }>(sqlPayables, [as_of_date]);
    } catch {
        payablesRows = [{ payables: 0 }];
    }

    const cb = cashBankRows?.[0] || {};
    const rec = receivablesRows?.[0] || {};
    const pay = payablesRows?.[0] || {};

    return {
        as_of_date,
        cash: Number(cb.cash) || 0,
        bank: Number(cb.bank) || 0,
        receivables: Number(rec.receivables) || 0,
        payables: Number(pay.payables) || 0,
    };
}
