import { NextRequest, NextResponse } from "next/server";
import { query, executeTransaction } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AccountingPayment, AccountingPaymentAllocation } from "@/lib/types/accounting";
import { hasSystemAccess } from "@/lib/permissions";

// DELETE /api/accounting/payments/[id] - Soft delete a payment and update invoice balances
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { id: paymentId } = await context.params;

        // Check if payment exists
        const payments = await query<AccountingPayment>(
            "SELECT * FROM accounting_payments WHERE id = ? AND deleted_at IS NULL",
            [paymentId]
        );

        if (!payments || payments.length === 0) {
            return NextResponse.json({ error: "الدفعة غير موجودة" }, { status: 404 });
        }

        const payment = payments[0];

        // Permission check: Only authorized staff can delete posted payments
        const hasAccess = await hasSystemAccess(user.role, "accounting");
        if (payment.state !== "draft" && !hasAccess) {
            return NextResponse.json(
                { error: "Forbidden. Only authorized staff can delete posted payments." },
                { status: 403 }
            );
        }

        // Get all allocations to this payment
        const allocations = await query<AccountingPaymentAllocation>(
            "SELECT * FROM accounting_payment_allocations WHERE payment_id = ?",
            [paymentId]
        );

        // Perform everything in a transaction
        await executeTransaction(async (conn) => {
            // 1. Soft delete payment
            await conn.execute(
                "UPDATE accounting_payments SET deleted_at = NOW() WHERE id = ?",
                [paymentId]
            );

            // 2. Update affected invoices
            for (const alloc of allocations) {
                const { invoice_id, amount: allocatedAmount } = alloc;

                // Update invoice: decrease amount_paid, increase amount_due
                await conn.execute(
                    `UPDATE accounting_invoices 
                      SET amount_paid = amount_paid - ?,
                          amount_due = amount_due + ?,
                          state = CASE 
                             WHEN (amount_paid - ?) <= 0 THEN 'posted'
                             WHEN (amount_due + ?) <= 0 THEN 'paid'
                             ELSE 'partial'
                          END,
                          updated_at = NOW()
                      WHERE id = ?`,
                    [allocatedAmount, allocatedAmount, allocatedAmount, allocatedAmount, invoice_id]
                );
            }

            // 3. Audit log
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'delete', 'payment', ?, ?)`,
                [user.id, paymentId, JSON.stringify({ 
                    payment_number: payment.payment_number, 
                    amount: payment.amount,
                    affected_invoices: allocations.map((a: AccountingPaymentAllocation) => a.invoice_id)
                })]
            );
        });

        return NextResponse.json({ message: "Payment deleted successfully" });
    } catch (error: unknown) {
        console.error("Error deleting payment:", error);
        return NextResponse.json(
            { error: "فشل في حذف الدفعة", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
