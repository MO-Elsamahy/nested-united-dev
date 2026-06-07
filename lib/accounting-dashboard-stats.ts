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
 * أرصدة الداشبورد — منطق مباشر وبسيط:
 *
 * الخزينة والبنك:
 *   - مباشرة من جدول accounting_payments (المبالغ المقبوضة - المدفوعة)
 *   - بدون اعتماد على دليل الحسابات أو account_subtype
 *   - الخزينة = inbound cash, البنك = inbound bank/غيره
 *
 * مستحقات العملاء والموردين:
 *   - من جدول accounting_invoices (amount_due للفواتير المؤكدة)
 */
export async function getAccountingDashboardStats(asOfDate?: string): Promise<AccountingDashboardStats> {
    const as_of_date = asOfDate || new Date().toISOString().split("T")[0];

    try {
        // ─── الخزينة: مجموع الدفعات النقدية (cash) المقبوضة - المصروفة ───
        const [cashRows] = await Promise.all([
            query<{ balance: number }>(`
                SELECT COALESCE(
                    SUM(CASE WHEN payment_type = 'inbound' THEN amount ELSE -amount END),
                    0
                ) AS balance
                FROM accounting_payments
                WHERE deleted_at IS NULL
                  AND state = 'posted'
                  AND payment_method = 'cash'
                  AND payment_date <= ?
            `, [as_of_date])
        ]);

        // ─── البنك: مجموع الدفعات البنكية ───
        const [bankRows] = await Promise.all([
            query<{ balance: number }>(`
                SELECT COALESCE(
                    SUM(CASE WHEN payment_type = 'inbound' THEN amount ELSE -amount END),
                    0
                ) AS balance
                FROM accounting_payments
                WHERE deleted_at IS NULL
                  AND state = 'posted'
                  AND payment_method != 'cash'
                  AND payment_date <= ?
            `, [as_of_date])
        ]);

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
            cash:        Number(cashRows[0]?.balance)         || 0,
            bank:        Number(bankRows[0]?.balance)         || 0,
            receivables: Number(receivablesRows[0]?.receivables) || 0,
            payables:    Number(payablesRows[0]?.payables)    || 0,
        };

    } catch (error) {
        console.error("Dashboard stats error:", error);
        return { as_of_date, cash: 0, bank: 0, receivables: 0, payables: 0 };
    }
}
