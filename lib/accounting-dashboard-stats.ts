import { query } from "@/lib/db";

export type AccountingDashboardStats = {
    as_of_date: string;
    /** خزينة/صندوق */
    cash: number;
    /** بنك */
    bank: number;
    /** ذمم مدينة (عملاء) */
    receivables: number;
    /** ذمم دائنة (موردين) */
    payables: number;
};

/**
 * أرصدة الداشبورد — تعتمد على القيود المحاسبية (accounting_move_lines):
 *
 * الخزينة والبنك:
 *   - محسوبة من القيود المرحّلة على حسابات asset_bank
 *   - account_subtype = 'cash' → خزينة
 *   - account_subtype = 'bank' → بنك
 *   - يشمل: سندات القبض/الصرف + القيود المباشرة المسجلة يدوياً
 *
 * مستحقات العملاء والموردين:
 *   - من جدول accounting_invoices (amount_due للفواتير غير المسددة)
 */
export async function getAccountingDashboardStats(asOfDate?: string): Promise<AccountingDashboardStats> {
    const as_of_date = asOfDate || new Date().toISOString().split("T")[0];

    try {
        // ─── الخزينة: من القيود المحاسبية على حسابات account_subtype = 'cash' ───
        // يشمل سندات القبض/الصرف + القيود المباشرة
        const cashRows = await query<{ balance: number }>(`
            SELECT COALESCE(SUM(ml.debit - ml.credit), 0) AS balance
            FROM accounting_move_lines ml
            JOIN accounting_moves m ON ml.move_id = m.id
            JOIN accounting_accounts a ON ml.account_id = a.id
            WHERE m.state = 'posted'
              AND m.deleted_at IS NULL
              AND m.date <= ?
              AND a.deleted_at IS NULL
              AND a.type = 'asset_bank'
              AND a.account_subtype = 'cash'
        `, [as_of_date]);

        // ─── البنك: من القيود المحاسبية على حسابات account_subtype = 'bank' ───
        const bankRows = await query<{ balance: number }>(`
            SELECT COALESCE(SUM(ml.debit - ml.credit), 0) AS balance
            FROM accounting_move_lines ml
            JOIN accounting_moves m ON ml.move_id = m.id
            JOIN accounting_accounts a ON ml.account_id = a.id
            WHERE m.state = 'posted'
              AND m.deleted_at IS NULL
              AND m.date <= ?
              AND a.deleted_at IS NULL
              AND a.type = 'asset_bank'
              AND a.account_subtype = 'bank'
        `, [as_of_date]);

        // ─── مستحقات العملاء ───
        const receivablesRows = await query<{ receivables: number }>(`
            SELECT COALESCE(SUM(amount_due), 0) AS receivables
            FROM accounting_invoices
            WHERE deleted_at IS NULL
              AND invoice_type = 'customer_invoice'
              AND state NOT IN ('paid', 'cancelled', '')
              AND invoice_date <= ?
        `, [as_of_date]);

        // ─── مستحقات الموردين ───
        const payablesRows = await query<{ payables: number }>(`
            SELECT COALESCE(SUM(amount_due), 0) AS payables
            FROM accounting_invoices
            WHERE deleted_at IS NULL
              AND invoice_type IN ('supplier_bill', 'vendor_bill')
              AND state NOT IN ('paid', 'cancelled', '')
              AND invoice_date <= ?
        `, [as_of_date]);

        return {
            as_of_date,
            cash:        Number(cashRows[0]?.balance)            || 0,
            bank:        Number(bankRows[0]?.balance)            || 0,
            receivables: Number(receivablesRows[0]?.receivables) || 0,
            payables:    Number(payablesRows[0]?.payables)       || 0,
        };

    } catch (error) {
        console.error("Dashboard stats error:", error);
        return { as_of_date, cash: 0, bank: 0, receivables: 0, payables: 0 };
    }
}
