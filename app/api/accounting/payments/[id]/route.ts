import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, executeTransaction } from "@/lib/db";

// DELETE /api/accounting/payments/[id] - Soft delete a payment and update invoice balances
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: paymentId } = await context.params;

        // Check if payment exists
        const payments: any = await query(
            "SELECT * FROM accounting_payments WHERE id = ? AND deleted_at IS NULL",
            [paymentId]
        );

        if (!payments || payments.length === 0) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        const payment = payments[0];

        // Permission check: Only super admins can delete posted payments? 
        // For now, let's check roles
        if (payment.state !== "draft" && session.user.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden. Only super admins can delete posted payments." },
                { status: 403 }
            );
        }

        // Get all allocations to this payment
        const allocations: any = await query(
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
                            WHEN (amount_paid - ?) <= 0 THEN 'confirmed'
                            ELSE 'partial'
                         END,
                         updated_at = NOW()
                     WHERE id = ?`,
                    [allocatedAmount, allocatedAmount, allocatedAmount, invoice_id]
                );
            }

            // 3. Audit log
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'delete', 'payment', ?, ?)`,
                [session.user.id, paymentId, JSON.stringify({ 
                    payment_number: payment.payment_number, 
                    amount: payment.amount,
                    affected_invoices: allocations.map((a: any) => a.invoice_id)
                })]
            );
        });

        return NextResponse.json({ message: "Payment deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting payment:", error);
        return NextResponse.json(
            { error: "Failed to delete payment", details: error.message },
            { status: 500 }
        );
    }
}
