import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { query, executeTransaction } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        if (user.role !== "super_admin") {
            return NextResponse.json({ error: "غير مصرح لك بإجراء هذا العمل" }, { status: 403 });
        }

        // 1. Fetch all confirmed invoices that do NOT have any payment allocations
        const unallocatedInvoices = await query<any>(
            `SELECT i.*
             FROM accounting_invoices i
             LEFT JOIN accounting_payment_allocations pa ON i.id = pa.invoice_id
             WHERE i.deleted_at IS NULL
               AND i.state IN ('confirmed', 'paid', 'partial')
               AND pa.id IS NULL`
        );

        if (!unallocatedInvoices || unallocatedInvoices.length === 0) {
            return NextResponse.json({ message: "لا توجد فواتير بحاجة لإنشاء سندات دفع" });
        }

        // 2. Fetch default accounts and journals to use for backfill
        const [cashJournals] = await query<any>(
            "SELECT * FROM accounting_journals WHERE (type = 'cash' OR type = 'bank') AND deleted_at IS NULL LIMIT 1"
        ) as any[];
        const defaultJournalId = cashJournals?.id;

        const [cashAccounts] = await query<any>(
            "SELECT * FROM accounting_accounts WHERE type = 'asset_bank' AND deleted_at IS NULL LIMIT 1"
        ) as any[];
        const defaultCashAccountId = cashAccounts?.id;

        const [receivableAccounts] = await query<any>(
            `SELECT * FROM accounting_accounts 
             WHERE (type = 'asset_receivable' 
                OR (type = 'asset_current' AND (name LIKE '%عميل%' OR name LIKE '%العملاء%' OR LOWER(name) LIKE '%customer%' OR LOWER(name) LIKE '%receivable%')))
               AND deleted_at IS NULL 
             LIMIT 1`
        ) as any[];
        const defaultArAccountId = receivableAccounts?.[0]?.id;

        const [payableAccounts] = await query<any>(
            `SELECT * FROM accounting_accounts 
             WHERE (type = 'liability_payable' 
                OR (type = 'liability_current' AND (name LIKE '%مورد%' OR name LIKE '%الموردين%' OR LOWER(name) LIKE '%supplier%' OR LOWER(name) LIKE '%payable%')))
               AND deleted_at IS NULL 
             LIMIT 1`
        ) as any[];
        const defaultApAccountId = payableAccounts?.[0]?.id;

        // Count existing payments to start payment numbering
        const [countRes] = await query<any>("SELECT COUNT(*) as count FROM accounting_payments") as any[];
        let paymentCounter = (countRes?.count || 0) + 1;

        const results: { invoice_number: string; payment_number: string }[] = [];

        await executeTransaction(async (conn) => {
            for (const inv of unallocatedInvoices) {
                const paymentId = uuidv4();
                const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCounter++).padStart(4, "0")}`;
                const paymentType = inv.invoice_type === "customer_invoice" ? "inbound" : "outbound";

                // Determine journal and accounts for this invoice
                const journalId = inv.journal_id || defaultJournalId;
                const cashAccountId = defaultCashAccountId;
                const arAccountId = defaultArAccountId;
                const apAccountId = defaultApAccountId;

                if (!journalId || !cashAccountId) {
                    throw new Error(`تعذر العثور على دفتر يومية نقدية أو حساب خزينة مناسب للفاتورة ${inv.invoice_number}`);
                }

                // 1. Create Payment
                await conn.execute(
                    `INSERT INTO accounting_payments (
                        id, payment_number, payment_type, partner_id, payment_date,
                        amount, currency, payment_method, journal_id, state,
                        notes, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, 'SAR', 'cash', ?, 'posted', ?, ?)`,
                    [
                        paymentId,
                        paymentNumber,
                        paymentType,
                        inv.partner_id,
                        inv.invoice_date,
                        inv.total_amount,
                        journalId,
                        `سداد تلقائي بأثر رجعي للفاتورة رقم ${inv.invoice_number}`,
                        user.id
                    ]
                );

                // 2. Create Payment Allocation
                await conn.execute(
                    `INSERT INTO accounting_payment_allocations (
                        id, payment_id, invoice_id, amount
                    ) VALUES (UUID(), ?, ?, ?)`,
                    [paymentId, inv.id, inv.total_amount]
                );

                // 3. Create Payment Move
                const paymentMoveId = uuidv4();
                await conn.execute(
                    `INSERT INTO accounting_moves (
                        id, journal_id, date, ref, narration, state,
                        partner_id, amount_total, created_by
                    ) VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?)`,
                    [
                        paymentMoveId,
                        journalId,
                        inv.invoice_date,
                        `Payment: ${paymentNumber}`,
                        `سداد الفاتورة رقم ${inv.invoice_number} (أثر رجعي)`,
                        inv.partner_id,
                        inv.total_amount,
                        user.id
                    ]
                );

                // 4. Create Payment Move Lines (Double Entry)
                if (paymentType === "inbound") {
                    if (!arAccountId) {
                        throw new Error(`تعذر العثور على حساب العملاء/المدينين للفاتورة ${inv.invoice_number}`);
                    }
                    // Debit: Cash/Bank Account (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [
                            paymentMoveId,
                            cashAccountId,
                            inv.partner_id,
                            `سداد الفاتورة رقم ${inv.invoice_number}`,
                            inv.total_amount
                        ]
                    );

                    // Credit: Accounts Receivable (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, 0, ?)`,
                        [
                            paymentMoveId,
                            arAccountId,
                            inv.partner_id,
                            `تسوية الفاتورة رقم ${inv.invoice_number}`,
                            inv.total_amount
                        ]
                    );
                } else {
                    if (!apAccountId) {
                        throw new Error(`تعذر العثور على حساب الموردين/الدائنين للفاتورة ${inv.invoice_number}`);
                    }
                    // Debit: Accounts Payable (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [
                            paymentMoveId,
                            apAccountId,
                            inv.partner_id,
                            `سداد الفاتورة رقم ${inv.invoice_number}`,
                            inv.total_amount
                        ]
                    );

                    // Credit: Cash/Bank Account (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, 0, ?)`,
                        [
                            paymentMoveId,
                            cashAccountId,
                            inv.partner_id,
                            `تسوية الفاتورة رقم ${inv.invoice_number}`,
                            inv.total_amount
                        ]
                    );
                }

                // 5. Explicitly ensure invoice balances are correct
                await conn.execute(
                    `UPDATE accounting_invoices SET
                        amount_paid = ?,
                        amount_due = 0,
                        updated_at = NOW()
                     WHERE id = ?`,
                    [inv.total_amount, inv.id]
                );

                results.push({
                    invoice_number: inv.invoice_number,
                    payment_number: paymentNumber
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: `تم إنشاء سندات قبض وصرف لـ ${results.length} فواتير مسجلة مسبقاً بنجاح`,
            results
        });
    } catch (error: any) {
        console.error("Error backfilling payments:", error);
        return NextResponse.json(
            { error: "فشل تحديث الفواتير القديمة", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
