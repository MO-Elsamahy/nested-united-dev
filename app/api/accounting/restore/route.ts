import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { execute, executeTransaction, generateUUID } from "@/lib/db";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const id = searchParams.get("id");

        if (!id || !type) return NextResponse.json({ error: "Missing params" }, { status: 400 });

        // Validate type to prevent SQL injection or wrong table access
        let table = "";
        if (type === "move") table = "accounting_moves";
        else if (type === "account") table = "accounting_accounts";
        else if (type === "journal") table = "accounting_journals";
        else if (type === "partner") table = "accounting_partners";
        else if (type === "payment") {
            // Handled separately below
        } else {
            return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
        }

        if (type === "payment") {
            // Restore Payment and Invoice balances inside transaction
            await executeTransaction(async (conn) => {
                // Get allocations
                const [allocations] = await conn.execute(
                    "SELECT * FROM accounting_payment_allocations WHERE payment_id = ?",
                    [id]
                ) as any[];

                // Set payment deleted_at = NULL
                await conn.execute(
                    "UPDATE accounting_payments SET deleted_at = NULL WHERE id = ?",
                    [id]
                );

                // Get payment info to restore moves
                const [payments] = await conn.execute(
                    "SELECT payment_number FROM accounting_payments WHERE id = ?",
                    [id]
                ) as any[];
                const payment = payments?.[0];

                if (payment) {
                    // Restore corresponding moves if soft-deleted
                    await conn.execute(
                        "UPDATE accounting_moves SET deleted_at = NULL WHERE ref = ? AND deleted_at IS NOT NULL",
                        [`Payment: ${payment.payment_number}`]
                    );
                }

                // Update invoices
                if (allocations && allocations.length > 0) {
                    for (const alloc of allocations) {
                        const { invoice_id, amount: allocatedAmount } = alloc;
                        await conn.execute(
                            `UPDATE accounting_invoices 
                             SET amount_paid = amount_paid + ?,
                                 amount_due = amount_due - ?,
                                 state = CASE 
                                     WHEN (amount_due - ?) <= 0 THEN 'paid'
                                     ELSE 'partial'
                                 END,
                                 updated_at = NOW()
                             WHERE id = ?`,
                            [allocatedAmount, allocatedAmount, allocatedAmount, invoice_id]
                        );
                    }
                }
            });
        } else {
            // Restore Logic for other entities
            await execute(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id]);
        }

        // Log the restore action
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
          VALUES (?, ?, 'restore', ?, ?, ?)`,
            [generateUUID(), user.id, type, id, JSON.stringify({ restored_at: new Date() })]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

