import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { execute, executeTransaction, generateUUID } from "@/lib/db";

// Helper function to undo a single audit log inside a transaction
async function undoAuditLog(conn: any, L: { action: string; entity_type: string; entity_id: string; details: string }) {
    const details = JSON.parse(L.details || "{}");

    if (L.action === "delete") {
        // Undo deletion -> RESTORE the entity
        if (L.entity_type === "move") {
            await conn.execute("UPDATE accounting_moves SET deleted_at = NULL WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "account") {
            await conn.execute("UPDATE accounting_accounts SET deleted_at = NULL WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "journal") {
            await conn.execute("UPDATE accounting_journals SET deleted_at = NULL WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "partner") {
            await conn.execute("UPDATE accounting_partners SET deleted_at = NULL WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "payment") {
            // Restore payment
            await conn.execute("UPDATE accounting_payments SET deleted_at = NULL WHERE id = ?", [L.entity_id]);

            // Get allocations
            const [allocations] = await conn.execute(
                "SELECT * FROM accounting_payment_allocations WHERE payment_id = ?",
                [L.entity_id]
            ) as any[];

            // Re-apply allocations to invoice balances
            if (allocations && allocations.length > 0) {
                for (const alloc of allocations) {
                    await conn.execute(
                        `UPDATE accounting_invoices 
                         SET amount_paid = amount_paid + ?,
                             amount_due = amount_due - ?,
                             state = CASE WHEN (amount_due - ?) <= 0 THEN 'paid' ELSE 'partial' END,
                             updated_at = NOW()
                         WHERE id = ?`,
                        [alloc.amount, alloc.amount, alloc.amount, alloc.invoice_id]
                    );
                }
            }

            // Restore corresponding moves
            const [payments] = await conn.execute(
                "SELECT payment_number FROM accounting_payments WHERE id = ?",
                [L.entity_id]
            ) as any[];
            const payment = payments?.[0];
            if (payment) {
                await conn.execute(
                    "UPDATE accounting_moves SET deleted_at = NULL WHERE ref = ? AND deleted_at IS NOT NULL",
                    [`Payment: ${payment.payment_number}`]
                );
            }
        }
    } else if (L.action === "create" || L.action === "restore") {
        // Undo creation/restoration -> DELETE (soft-delete) the entity
        if (L.entity_type === "move") {
            await conn.execute("UPDATE accounting_moves SET deleted_at = NOW() WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "account") {
            await conn.execute("UPDATE accounting_accounts SET deleted_at = NOW() WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "journal") {
            await conn.execute("UPDATE accounting_journals SET deleted_at = NOW() WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "partner") {
            await conn.execute("UPDATE accounting_partners SET deleted_at = NOW() WHERE id = ?", [L.entity_id]);
        } else if (L.entity_type === "payment") {
            // Soft-delete the payment
            await conn.execute("UPDATE accounting_payments SET deleted_at = NOW() WHERE id = ?", [L.entity_id]);

            // Reverse the invoice balances
            const [allocations] = await conn.execute(
                "SELECT * FROM accounting_payment_allocations WHERE payment_id = ?",
                [L.entity_id]
            ) as any[];
            if (allocations && allocations.length > 0) {
                for (const alloc of allocations) {
                    await conn.execute(
                        `UPDATE accounting_invoices 
                         SET amount_paid = amount_paid - ?,
                             amount_due = amount_due + ?,
                             state = CASE WHEN (amount_paid - ?) <= 0 THEN 'draft' ELSE 'partial' END,
                             updated_at = NOW()
                         WHERE id = ?`,
                        [alloc.amount, alloc.amount, alloc.amount, alloc.invoice_id]
                    );
                }
            }

            // Soft-delete payment moves
            const [payments] = await conn.execute(
                "SELECT payment_number FROM accounting_payments WHERE id = ?",
                [L.entity_id]
            ) as any[];
            const payment = payments?.[0];
            if (payment) {
                await conn.execute(
                    "UPDATE accounting_moves SET deleted_at = NOW() WHERE ref = ?",
                    [`Payment: ${payment.payment_number}`]
                );
            }
        }
    } else if (L.action === "cancel") {
        // Undo cancellation -> Restore invoice state, delete reverse moves
        if (L.entity_type === "invoice") {
            const [invoices] = await conn.execute(
                "SELECT invoice_number, total_amount, amount_paid, amount_due FROM accounting_invoices WHERE id = ?",
                [L.entity_id]
            ) as any[];
            const invoice = invoices?.[0];
            if (invoice) {
                const state = invoice.amount_due <= 0 ? "paid" : (invoice.amount_paid > 0 ? "partial" : "posted");
                await conn.execute(
                    "UPDATE accounting_invoices SET state = ?, updated_at = NOW() WHERE id = ?",
                    [state, L.entity_id]
                );

                await conn.execute(
                    "UPDATE accounting_moves SET deleted_at = NOW() WHERE ref = ?",
                    [`REV-${invoice.invoice_number}`]
                );
            }
        }
    } else if (L.action === "confirm_salary") {
        if (L.entity_type === "payroll_detail") {
            await conn.execute(
                "UPDATE hr_payroll_details SET salary_confirmed_at = NULL, salary_confirmed_by = NULL WHERE id = ?",
                [L.entity_id]
            );
        }
    } else if (L.action === "update_subtype") {
        if (L.entity_type === "account") {
            await conn.execute(
                "UPDATE accounting_accounts SET account_subtype = NULL WHERE id = ?",
                [L.entity_id]
            );
        }
    }
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const logId = searchParams.get("log_id");

        if (!logId) return NextResponse.json({ error: "Missing log_id param" }, { status: 400 });

        await executeTransaction(async (conn) => {
            // 1. Get the target log
            const [targetLogs] = await conn.execute(
                "SELECT * FROM accounting_audit_logs WHERE id = ?",
                [logId]
            ) as any[];
            const targetLog = targetLogs?.[0];

            if (!targetLog) {
                throw new Error("Target audit log not found");
            }

            const targetTime = targetLog.created_at;

            // 2. Fetch all logs that occurred after or at the exact same time as the target log, in reverse order
            // Note: We pass the targetTime Date object directly to avoid timezone offset mismatches.
            const [logsToUndo] = await conn.execute(
                "SELECT * FROM accounting_audit_logs WHERE created_at >= ? ORDER BY created_at DESC",
                [targetTime]
            ) as any[];

            // 3. Loop and undo each log entry
            for (const log of logsToUndo) {
                await undoAuditLog(conn, log);
            }

            // 4. Delete the audit logs that were undone
            await conn.execute(
                "DELETE FROM accounting_audit_logs WHERE created_at >= ?",
                [targetTime]
            );
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
