import { NextRequest, NextResponse } from "next/server";
import { query, executeTransaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AccountingPayment } from "@/lib/types/accounting";
import { v4 as uuidv4 } from "uuid";

// GET /api/accounting/payments - قائمة السندات
export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type");
        const partnerId = searchParams.get("partner_id");
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");

        let sql = `
            SELECT
                p.*,
                ptr.name as partner_name,
                GROUP_CONCAT(DISTINCT i.invoice_number ORDER BY i.invoice_number SEPARATOR ', ') as invoices
            FROM accounting_payments p
            LEFT JOIN accounting_partners ptr ON p.partner_id = ptr.id
            LEFT JOIN accounting_payment_allocations pa ON p.id = pa.payment_id
            LEFT JOIN accounting_invoices i ON pa.invoice_id = i.id AND i.deleted_at IS NULL
            WHERE p.deleted_at IS NULL
        `;

        const params: (string | number)[] = [];

        if (type) { sql += " AND p.payment_type = ?"; params.push(type); }
        if (partnerId) { sql += " AND p.partner_id = ?"; params.push(partnerId); }
        if (startDate) { sql += " AND p.payment_date >= ?"; params.push(startDate); }
        if (endDate) { sql += " AND p.payment_date <= ?"; params.push(endDate); }

        sql += ` GROUP BY p.id ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 200`;

        const payments = await query<AccountingPayment>(sql, params);

        return NextResponse.json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "فشل في جلب الدفعات", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

// POST /api/accounting/payments - إنشاء سند قبض أو صرف جديد
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const body = await req.json();
        const {
            payment_type,  // 'inbound' | 'outbound'
            partner_id,
            payment_date,
            amount,
            payment_method = "cash",
            journal_id: requestedJournalId,
            invoice_ids = [], // فواتير للتسوية (اختياري)
            notes,
        } = body;

        if (!payment_type || !["inbound", "outbound"].includes(payment_type)) {
            return NextResponse.json({ error: "نوع السند غير صحيح (inbound/outbound)" }, { status: 400 });
        }
        if (!amount || Number(amount) <= 0) {
            return NextResponse.json({ error: "المبلغ يجب أن يكون أكبر من صفر" }, { status: 400 });
        }
        if (!payment_date) {
            return NextResponse.json({ error: "تاريخ السند مطلوب" }, { status: 400 });
        }

        const paymentId = uuidv4();
        let createdPayment: Record<string, unknown>;

        await executeTransaction(async (conn) => {
            // 1. توليد رقم السند
            const [countRes] = await conn.execute(
                "SELECT COUNT(*) as count FROM accounting_payments"
            ) as any[];
            const nextCount = (countRes[0]?.count || 0) + 1;
            const paymentNumber = `PAY-${new Date(payment_date).getFullYear()}-${String(nextCount).padStart(4, "0")}`;

            // 2. دفتر يومية الخزينة / البنك
            let journalId = requestedJournalId;
            if (!journalId) {
                const [cashJournals] = await conn.execute(
                    "SELECT * FROM accounting_journals WHERE (type = 'cash' OR type = 'bank') AND deleted_at IS NULL ORDER BY FIELD(type, 'cash', 'bank') LIMIT 1"
                ) as any[];
                if (!cashJournals || cashJournals.length === 0) {
                    throw new Error("لم يتم العثور على دفتر يومية نقدي أو بنكي. يرجى إعداده أولاً.");
                }
                journalId = cashJournals[0].id;
            }

            // 3. حساب الخزينة / البنك — نبحث بالترتيب: الحساب الافتراضي للجورنال → أي حساب asset_bank
            const [journalAccounts] = await conn.execute(
                "SELECT aa.* FROM accounting_journals j JOIN accounting_accounts aa ON aa.id = j.default_account_id WHERE j.id = ? AND aa.deleted_at IS NULL LIMIT 1",
                [journalId]
            ) as any[];
            let cashAccount = journalAccounts?.[0] || null;

            if (!cashAccount) {
                const [cashAccounts] = await conn.execute(
                    "SELECT * FROM accounting_accounts WHERE type = 'asset_bank' AND deleted_at IS NULL ORDER BY code ASC LIMIT 1"
                ) as any[];
                cashAccount = cashAccounts?.[0] || null;
            }
            // إذا لم يكن هناك حساب — نكمل بدون قيد محاسبي (السند يُنشأ لكن بدون move)
            const skipJournalEntry = !cashAccount;

            // 4. حساب الذمم (عملاء / موردين) للتسوية — اختياري
            let partnerAccount = null;
            if (!skipJournalEntry) {
                if (payment_type === "inbound") {
                    const [receivableAccounts] = await conn.execute(
                        `SELECT * FROM accounting_accounts WHERE type IN ('asset_receivable','asset_current') AND deleted_at IS NULL ORDER BY type ASC LIMIT 1`
                    ) as any[];
                    partnerAccount = receivableAccounts?.[0] || cashAccount;
                } else {
                    const [payableAccounts] = await conn.execute(
                        `SELECT * FROM accounting_accounts WHERE type IN ('liability_payable','liability_current') AND deleted_at IS NULL ORDER BY type ASC LIMIT 1`
                    ) as any[];
                    partnerAccount = payableAccounts?.[0] || cashAccount;
                }
            }

            // 5. إنشاء السند في قاعدة البيانات
            await conn.execute(
                `INSERT INTO accounting_payments (
                    id, payment_number, payment_type, partner_id, payment_date,
                    amount, currency, payment_method, journal_id, state,
                    notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'SAR', ?, ?, 'posted', ?, ?)`,
                [
                    paymentId, paymentNumber, payment_type,
                    partner_id || null, payment_date,
                    Number(amount), payment_method, journalId,
                    notes || null, user.id
                ]
            );

            // 6. إنشاء القيد المحاسبي (اختياري — يُتخطى إذا لم تُعثر على حسابات)
            if (!skipJournalEntry) {
                const moveId = uuidv4();
                const moveRef = `Payment: ${paymentNumber}`;
                const moveNarration = notes || `${payment_type === "inbound" ? "سند قبض" : "سند صرف"} ${paymentNumber}`;

                await conn.execute(
                    `INSERT INTO accounting_moves (
                        id, journal_id, date, ref, narration, state,
                        partner_id, amount_total, created_by
                    ) VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?)`,
                    [
                        moveId, journalId, payment_date, moveRef, moveNarration,
                        partner_id || null, Number(amount), user.id
                    ]
                );

                // 7. أسطر القيد (قيد مزدوج)
                if (payment_type === "inbound") {
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, name, debit, credit)
                         VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [moveId, cashAccount.id, partner_id || null, moveNarration, Number(amount)]
                    );
                    const creditAccount = partnerAccount || cashAccount;
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, name, debit, credit)
                         VALUES (UUID(), ?, ?, ?, ?, 0, ?)`,
                        [moveId, creditAccount.id, partner_id || null, `تسوية - ${moveNarration}`, Number(amount)]
                    );
                } else {
                    const debitAccount = partnerAccount || cashAccount;
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, name, debit, credit)
                         VALUES (UUID(), ?, ?, ?, ?, ?, 0)`,
                        [moveId, debitAccount.id, partner_id || null, moveNarration, Number(amount)]
                    );
                    await conn.execute(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, name, debit, credit)
                         VALUES (UUID(), ?, ?, ?, ?, 0, ?)`,
                        [moveId, cashAccount.id, partner_id || null, `صرف - ${moveNarration}`, Number(amount)]
                    );
                }
            }

            // 8. تسوية الفواتير (إذا وُجدت)
            let remainingAmount = Number(amount);
            for (const invoiceId of invoice_ids) {
                if (remainingAmount <= 0) break;

                const [invoices] = await conn.execute(
                    "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL FOR UPDATE",
                    [invoiceId]
                ) as any[];

                if (!invoices || invoices.length === 0) continue;
                const invoice = invoices[0];

                const toAllocate = Math.min(remainingAmount, Number(invoice.amount_due));
                if (toAllocate <= 0) continue;

                // إدخال تخصيص
                await conn.execute(
                    `INSERT INTO accounting_payment_allocations (id, payment_id, invoice_id, amount)
                     VALUES (UUID(), ?, ?, ?)`,
                    [paymentId, invoiceId, toAllocate]
                );

                // تحديث الفاتورة
                const newPaid = Number(invoice.amount_paid) + toAllocate;
                const newDue = Math.max(0, Number(invoice.total_amount) - newPaid);
                let newState = invoice.state;
                if (newDue <= 0) newState = "paid";
                else if (newPaid > 0) newState = "partial";

                await conn.execute(
                    `UPDATE accounting_invoices SET
                        amount_paid = ?, amount_due = ?, state = ?, updated_at = NOW()
                     WHERE id = ?`,
                    [newPaid, newDue, newState, invoiceId]
                );

                remainingAmount -= toAllocate;
            }

            // 9. سجل التدقيق
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'create', 'payment', ?, ?)`,
                [user.id, paymentId, JSON.stringify({
                    payment_number: paymentNumber,
                    payment_type, amount: Number(amount),
                    invoice_ids
                })]
            );

            // جلب السند المُنشأ
            const [created] = await conn.execute(
                `SELECT p.*, ptr.name as partner_name FROM accounting_payments p
                 LEFT JOIN accounting_partners ptr ON p.partner_id = ptr.id
                 WHERE p.id = ?`,
                [paymentId]
            ) as any[];
            createdPayment = created[0];
        });

        return NextResponse.json({ message: "تم إنشاء السند بنجاح", payment: createdPayment! }, { status: 201 });
    } catch (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json(
            { error: "فشل في إنشاء السند", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
