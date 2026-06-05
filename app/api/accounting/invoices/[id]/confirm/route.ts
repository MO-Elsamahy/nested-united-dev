import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

import { query, executeTransaction } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface InvoiceRow {
    id: string;
    invoice_number: string;
    invoice_type: 'customer_invoice' | 'supplier_bill' | 'vendor_bill' | 'credit_note';
    state: string;
    invoice_date: string;
    due_date: string;
    partner_id: string;
    total_amount: number;
    notes: string | null;
}

interface InvoiceLineRow {
    id: string;
    invoice_id: string;
    account_id: string | null;
    description: string;
    line_total: number;
    tax_amount: number;
    tax_rate: number;
}

interface JournalRow {
    id: string;
    type: string;
}

interface AccountRow {
    id: string;
    type: string;
    code: string;
}

// POST /api/accounting/invoices/[id]/confirm - Confirm invoice and create journal entry
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        const moveId = uuidv4();
        let updatedInvoice: InvoiceRow & { partner_name: string };

        await executeTransaction(async (conn) => {
            // 1. Get invoice and lock the row using FOR UPDATE
            const [invoices] = await conn.execute(
                "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
                [invoiceId]
            ) as any[];

            if (!invoices || invoices.length === 0) {
                throw new Error("الفاتورة غير موجودة");
            }

            const invoice = invoices[0] as InvoiceRow;

            // 2. Check if already confirmed
            if (invoice.state !== "draft") {
                throw new Error("الفاتورة مؤكدة بالفعل أو ملغاة");
            }

            // 3. Get invoice lines
            const [lines] = await conn.execute(
                "SELECT * FROM accounting_invoice_lines WHERE invoice_id = ?",
                [invoiceId]
            ) as any[];

            if (!lines || lines.length === 0) {
                throw new Error("الفاتورة لا تحتوي على أي بنود");
            }

            // 4. Get appropriate journal (Sales or Purchase)
            const journalType = invoice.invoice_type === "customer_invoice" || invoice.invoice_type === "credit_note"
                ? "sale"
                : "purchase";

            const [journals] = await conn.execute(
                "SELECT * FROM accounting_journals WHERE type = ? AND deleted_at IS NULL LIMIT 1",
                [journalType]
            ) as any[];

            if (!journals || journals.length === 0) {
                throw new Error(`لم يتم العثور على دفتر يومية للـ ${journalType === 'sale' ? 'مبيعات' : 'مشتريات'}. يرجى إعداده أولاً.`);
            }

            const journal = journals[0] as JournalRow;

            // 5. Get default accounts based on invoice type
            const [receivableAccounts] = await conn.execute(
                `SELECT * FROM accounting_accounts 
                 WHERE (type = 'asset_receivable' 
                    OR (type = 'asset_current' AND (name LIKE '%عميل%' OR name LIKE '%العملاء%' OR LOWER(name) LIKE '%customer%' OR LOWER(name) LIKE '%receivable%')))
                   AND deleted_at IS NULL 
                 LIMIT 1`
            ) as any[];

            const [payableAccounts] = await conn.execute(
                `SELECT * FROM accounting_accounts 
                 WHERE (type = 'liability_payable' 
                    OR (type = 'liability_current' AND (name LIKE '%مورد%' OR name LIKE '%الموردين%' OR LOWER(name) LIKE '%supplier%' OR LOWER(name) LIKE '%payable%')))
                   AND deleted_at IS NULL 
                 LIMIT 1`
            ) as any[];

            const [incomeAccounts] = await conn.execute(
                "SELECT * FROM accounting_accounts WHERE type = 'income' AND deleted_at IS NULL LIMIT 1"
            ) as any[];

            const [expenseAccounts] = await conn.execute(
                "SELECT * FROM accounting_accounts WHERE type = 'expense' OR type = 'cost_of_sales' ORDER BY FIELD(type, 'cost_of_sales', 'expense') LIMIT 1"
            ) as any[];

            const [taxAccounts] = await conn.execute(
                "SELECT * FROM accounting_accounts WHERE type = 'liability_current' AND code LIKE '22%' AND deleted_at IS NULL LIMIT 1"
            ) as any[];

            if (invoice.invoice_type === "customer_invoice") {
                if (!receivableAccounts || receivableAccounts.length === 0) {
                    throw new Error("لم يتم العثور على حساب للمدينين/العملاء. يرجى إنشاء حساب 'Accounts Receivable' أولاً.");
                }
                if (!incomeAccounts || incomeAccounts.length === 0) {
                    throw new Error("لم يتم العثور على حساب للإيرادات. يرجى إنشاء حساب 'Income' أولاً.");
                }
            }

            if (invoice.invoice_type === "supplier_bill" || invoice.invoice_type === "vendor_bill") {
                if (!payableAccounts || payableAccounts.length === 0) {
                    throw new Error("لم يتم العثور على حساب للدائنين/الموردين. يرجى إنشاء حساب 'Accounts Payable' أولاً.");
                }
                if (!expenseAccounts || expenseAccounts.length === 0) {
                    throw new Error("لم يتم العثور على حساب للمصروفات. يرجى إنشاء حساب 'Expense' أولاً.");
                }
            }

            const moveRef = `Invoice: ${invoice.invoice_number}`;

            await conn.execute(
                `INSERT INTO accounting_moves (
                    id, journal_id, date, ref, narration, state,
                    partner_id, amount_total, created_by
                ) VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?)`,
                [
                    moveId,
                    journal.id,
                    invoice.invoice_date,
                    moveRef,
                    invoice.notes || `Confirmed invoice ${invoice.invoice_number}`,
                    invoice.partner_id,
                    invoice.total_amount,
                    user.id,
                ]
            );

            // Create move lines (double entry)
            if (invoice.invoice_type === "customer_invoice") {
                // Debit: Accounts Receivable (Full Amount)
                await conn.execute(
                    `INSERT INTO accounting_move_lines (
                        id, move_id, account_id, partner_id, name,
                        debit, credit, date_maturity
                    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
                    [
                        uuidv4(),
                        moveId,
                        receivableAccounts[0].id,
                        invoice.partner_id,
                        `Invoice ${invoice.invoice_number}`,
                        invoice.total_amount,
                        invoice.due_date,
                    ]
                );

                // Credit: Revenue accounts (Net Amount) + Tax (Tax Amount)
                for (const line of lines) {
                    const revenueAccountId = line.account_id || (incomeAccounts.length > 0 ? incomeAccounts[0].id : null);

                    if (revenueAccountId) {
                        // 1. Credit Revenue (Net amount)
                        await conn.execute(
                            `INSERT INTO accounting_move_lines (
                                id, move_id, account_id, partner_id, name,
                                debit, credit
                            ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
                            [
                                uuidv4(),
                                moveId,
                                revenueAccountId,
                                invoice.partner_id,
                                line.description,
                                line.line_total, // Net amount
                            ]
                        );

                        // 2. Credit VAT (if applicable)
                        if (Number(line.tax_amount) > 0 && taxAccounts.length > 0) {
                            await conn.execute(
                                `INSERT INTO accounting_move_lines (
                                    id, move_id, account_id, partner_id, name,
                                    debit, credit
                                ) VALUES (?, ?, ?, ?, ?, 0, ?)`,
                                [
                                    uuidv4(),
                                    moveId,
                                    taxAccounts[0].id,
                                    invoice.partner_id,
                                    `VAT ${line.tax_rate}% - ${line.description}`,
                                    line.tax_amount,
                                ]
                            );
                        }
                    }
                }
            } else if (invoice.invoice_type === "supplier_bill" || invoice.invoice_type === "vendor_bill") {
                // Debit: Expense accounts (Net Amount) + Tax Receivable? (For now simplify: Debit Expense with Total or Split)
                // Simplified: Debit Expense (Net) + Debit VAT (Tax)

                for (const line of lines) {
                    const expenseAccountId = line.account_id || (expenseAccounts.length > 0 ? expenseAccounts[0].id : null);

                    if (expenseAccountId) {
                        // 1. Debit Expense (Net)
                        await conn.execute(
                            `INSERT INTO accounting_move_lines (
                                id, move_id, account_id, partner_id, name,
                                debit, credit
                            ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                            [
                                uuidv4(),
                                moveId,
                                expenseAccountId,
                                invoice.partner_id,
                                line.description,
                                line.line_total,
                            ]
                        );

                        // 2. Debit VAT (Input Tax) - allowing claim check
                        // Ideally this goes to a Tax Receivable account, but using same Tax account as debit for now (claiming back)
                        if (Number(line.tax_amount) > 0 && taxAccounts.length > 0) {
                            await conn.execute(
                                `INSERT INTO accounting_move_lines (
                                    id, move_id, account_id, partner_id, name,
                                    debit, credit
                                ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
                                [
                                    uuidv4(),
                                    moveId,
                                    taxAccounts[0].id,
                                    invoice.partner_id,
                                    `VAT Input ${line.tax_rate}% - ${line.description}`,
                                    line.tax_amount,
                                ]
                            );
                        }
                    }
                }

                // Credit: Accounts Payable
                await conn.execute(
                    `INSERT INTO accounting_move_lines (
                        id, move_id, account_id, partner_id, name,
                        debit, credit, date_maturity
                    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
                    [
                        uuidv4(),
                        moveId,
                        payableAccounts[0].id,
                        invoice.partner_id,
                        `Bill ${invoice.invoice_number}`,
                        invoice.total_amount,
                        invoice.due_date,
                    ]
                );
            }

            // --- AUTOMATIC PAYMENT REGISTRATION ---
            // Since confirmed = paid in this business flow, we automatically register a full payment.
            const paymentId = uuidv4();
            let paymentMoveId: string | null = null;

            // 1. Generate payment number
            const [countRes] = await conn.execute("SELECT COUNT(*) as count FROM accounting_payments") as any[];
            const nextCount = (countRes[0]?.count || 0) + 1;
            const paymentNumber = `PAY-${new Date().getFullYear()}-${String(nextCount).padStart(4, "0")}`;

            // 2. Get default cash/bank journal
            const [cashJournals] = await conn.execute(
                "SELECT * FROM accounting_journals WHERE (type = 'cash' OR type = 'bank') AND deleted_at IS NULL LIMIT 1"
            ) as any[];
            const paymentJournalId = cashJournals[0]?.id || journal.id;

            // 3. Get default cash/bank account
            const [cashAccounts] = await conn.execute(
                "SELECT * FROM accounting_accounts WHERE type = 'asset_bank' AND deleted_at IS NULL LIMIT 1"
            ) as any[];

            if (cashAccounts && cashAccounts.length > 0) {
                const cashAccount = cashAccounts[0];
                const paymentType = invoice.invoice_type === "customer_invoice" ? "inbound" : "outbound";

                // Create Payment
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
                        invoice.partner_id,
                        invoice.invoice_date,
                        invoice.total_amount,
                        paymentJournalId,
                        `سداد تلقائي للفاتورة رقم ${invoice.invoice_number}`,
                        user.id
                    ]
                );

                // Create Payment Allocation
                await conn.execute(
                    `INSERT INTO accounting_payment_allocations (
                        id, payment_id, invoice_id, amount
                    ) VALUES (UUID(), ?, ?, ?)`,
                    [paymentId, invoiceId, invoice.total_amount]
                );

                // Create Payment Move (Journal Entry)
                paymentMoveId = uuidv4();
                await conn.execute(
                    `INSERT INTO accounting_moves (
                        id, journal_id, date, ref, narration, state,
                        partner_id, amount_total, created_by
                    ) VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?)`,
                    [
                        paymentMoveId,
                        paymentJournalId,
                        invoice.invoice_date,
                        `Payment: ${paymentNumber}`,
                        `سداد الفاتورة رقم ${invoice.invoice_number}`,
                        invoice.partner_id,
                        invoice.total_amount,
                        user.id
                    ]
                );

                // Create Payment Move Lines (Double Entry)
                if (paymentType === "inbound") {
                    // Debit: Cash/Bank Account (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [
                            paymentMoveId,
                            cashAccount.id,
                            invoice.partner_id,
                            `سداد الفاتورة رقم ${invoice.invoice_number}`,
                            invoice.total_amount
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
                            receivableAccounts[0].id,
                            invoice.partner_id,
                            `تسوية الفاتورة رقم ${invoice.invoice_number}`,
                            invoice.total_amount
                        ]
                    );
                } else {
                    // Debit: Accounts Payable (Full Amount)
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (
                            id, move_id, account_id, partner_id, name,
                            debit, credit
                        ) VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [
                            paymentMoveId,
                            payableAccounts[0].id,
                            invoice.partner_id,
                            `سداد الفاتورة رقم ${invoice.invoice_number}`,
                            invoice.total_amount
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
                            cashAccount.id,
                            invoice.partner_id,
                            `تسوية الفاتورة رقم ${invoice.invoice_number}`,
                            invoice.total_amount
                        ]
                    );
                }

                // Update Invoice to confirmed with full payment details
                await conn.execute(
                    `UPDATE accounting_invoices SET
                        state = 'confirmed',
                        amount_paid = ?,
                        amount_due = 0,
                        accounting_move_id = ?,
                        journal_id = ?,
                        updated_at = NOW()
                     WHERE id = ?`,
                    [invoice.total_amount, moveId, journal.id, invoiceId]
                );
            } else {
                // Fallback (if no cash account exists, just update state to confirmed)
                await conn.execute(
                    `UPDATE accounting_invoices SET
                        state = 'confirmed',
                        accounting_move_id = ?,
                        journal_id = ?,
                        updated_at = NOW()
                     WHERE id = ?`,
                    [moveId, journal.id, invoiceId]
                );
            }

            // Write Audit Log
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'confirm', 'invoice', ?, ?)`,
                [
                    user.id,
                    invoiceId,
                    JSON.stringify({
                        invoice_number: invoice.invoice_number,
                        total_amount: invoice.total_amount,
                        invoice_move_id: moveId,
                        payment_id: cashAccounts && cashAccounts.length > 0 ? paymentId : null,
                        payment_move_id: cashAccounts && cashAccounts.length > 0 ? paymentMoveId : null,
                    })
                ]
            );

            // Fetch updated invoice within transaction
            const [updatedRows] = await conn.execute(
                `SELECT i.*, p.name as partner_name
                 FROM accounting_invoices i
                 LEFT JOIN accounting_partners p ON i.partner_id = p.id
                 WHERE i.id = ?`,
                [invoiceId]
            ) as any[];
            updatedInvoice = updatedRows[0];
        });

        return NextResponse.json({
            message: "Invoice confirmed successfully",
            invoice: updatedInvoice!,
            accounting_move_id: moveId,
        });
    } catch (error: unknown) {
        console.error("Error confirming invoice:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: "فشل في تأكيد الفاتورة", details: errorMessage },
            { status: 500 }
        );
    }
}
