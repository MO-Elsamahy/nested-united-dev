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

// POST /api/accounting/invoices/[id]/confirm
// تأكيد الفاتورة وإنشاء قيد المبيعات/المشتريات فقط — بدون سداد تلقائي
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
            // 1. جلب الفاتورة وقفلها
            const [invoices] = await conn.execute(
                "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
                [invoiceId]
            ) as any[];

            if (!invoices || invoices.length === 0) {
                throw new Error("الفاتورة غير موجودة");
            }

            const invoice = invoices[0] as InvoiceRow;

            // 2. التحقق من حالة الفاتورة
            if (invoice.state !== "draft") {
                throw new Error("الفاتورة مؤكدة بالفعل أو ملغاة");
            }

            // 3. بنود الفاتورة
            const [lines] = await conn.execute(
                "SELECT * FROM accounting_invoice_lines WHERE invoice_id = ?",
                [invoiceId]
            ) as any[];

            if (!lines || lines.length === 0) {
                throw new Error("الفاتورة لا تحتوي على أي بنود");
            }

            // 4. دفتر اليومية المناسب (مبيعات / مشتريات)
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

            // 5. الحسابات المحاسبية الافتراضية
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

            // 6. إنشاء القيد المحاسبي الرئيسي (فاتورة المبيعات / المشتريات)
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
                    invoice.notes || `تأكيد الفاتورة ${invoice.invoice_number}`,
                    invoice.partner_id,
                    invoice.total_amount,
                    user.id,
                ]
            );

            // 7. أسطر القيد (قيد مزدوج)
            if (invoice.invoice_type === "customer_invoice") {
                // مدين: ذمم مدينة (العملاء) بالمبلغ الإجمالي
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

                // دائن: إيرادات (المبلغ الصافي) + ضريبة
                for (const line of lines) {
                    const revenueAccountId = line.account_id || (incomeAccounts.length > 0 ? incomeAccounts[0].id : null);

                    if (revenueAccountId) {
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
                                line.line_total,
                            ]
                        );

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
                // مدين: مصروفات لكل بند
                for (const line of lines) {
                    const expenseAccountId = line.account_id || (expenseAccounts.length > 0 ? expenseAccounts[0].id : null);

                    if (expenseAccountId) {
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

                // دائن: ذمم دائنة (الموردين) بالمبلغ الإجمالي
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

            // 8. تحديث الفاتورة إلى حالة مؤكدة (بدون سداد — السداد يتم عبر سند قبض منفصل)
            await conn.execute(
                `UPDATE accounting_invoices SET
                    state = 'posted',
                    amount_paid = 0,
                    amount_due = total_amount,
                    accounting_move_id = ?,
                    journal_id = ?,
                    updated_at = NOW()
                 WHERE id = ?`,
                [moveId, journal.id, invoiceId]
            );

            // 9. سجل التدقيق
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'confirm', 'invoice', ?, ?)`,
                [
                    user.id,
                    invoiceId,
                    JSON.stringify({
                        invoice_number: invoice.invoice_number,
                        total_amount: invoice.total_amount,
                        accounting_move_id: moveId,
                        journal_type: journalType,
                    })
                ]
            );

            // جلب الفاتورة المحدّثة
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
            message: "تم تأكيد الفاتورة بنجاح",
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
