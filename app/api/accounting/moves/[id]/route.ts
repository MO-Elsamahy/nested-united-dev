import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { query, queryOne, executeTransaction } from "@/lib/db";
import { AccountingMove } from "@/lib/types/accounting";
import { hasSystemAccess } from "@/lib/permissions";

/** GET: single journal entry (header + lines with account names) */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const move = await queryOne<AccountingMove & { journal_name?: string, journal_code?: string, partner_name?: string, created_by_name?: string }>(
            `SELECT m.*, j.name AS journal_name, j.code AS journal_code,
                    p.name AS partner_name, u.name AS created_by_name
             FROM accounting_moves m
             LEFT JOIN accounting_journals j ON m.journal_id = j.id
             LEFT JOIN accounting_partners p ON m.partner_id = p.id
             LEFT JOIN users u ON m.created_by = u.id
             WHERE m.id = ? AND m.deleted_at IS NULL`,
            [id]
        );

        if (!move) {
            return NextResponse.json({ error: "غير موجود" }, { status: 404 });
        }

        const lines = await query(
            `SELECT l.id, l.move_id, l.account_id, l.partner_id, l.cost_center_id, l.name, l.debit, l.credit, l.date_maturity,
                    a.code AS account_code, a.name AS account_name
             FROM accounting_move_lines l
             LEFT JOIN accounting_accounts a ON l.account_id = a.id
             WHERE l.move_id = ?
             ORDER BY l.debit DESC, l.credit DESC, l.id`,
            [id]
        );

        // Check for linked invoice
        const linkedInvoice = await queryOne<{ id: string, invoice_number: string }>(
            "SELECT id, invoice_number FROM accounting_invoices WHERE accounting_move_id = ? AND deleted_at IS NULL",
            [id]
        );

        // Check for linked payment
        const linkedPayment = move.ref?.startsWith("Payment: ") ? await queryOne<{ id: string, payment_number: string }>(
            "SELECT id, payment_number FROM accounting_payments WHERE payment_number = SUBSTRING(?, 10) AND deleted_at IS NULL",
            [move.ref]
        ) : null;

        return NextResponse.json({ move, lines, linkedInvoice, linkedPayment });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

/** PUT: update a manual journal entry */
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { id: moveId } = await params;

    try {
        const hasAccess = await hasSystemAccess(user.role, "accounting");
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden. Only authorized staff can edit journal entries." }, { status: 403 });
        }

        // Check if move exists
        const move = await queryOne<AccountingMove>("SELECT * FROM accounting_moves WHERE id = ? AND deleted_at IS NULL", [moveId]);
        if (!move) {
            return NextResponse.json({ error: "القيد غير موجود" }, { status: 404 });
        }

        // Check if linked to an active invoice
        const linkedInvoice = await queryOne<{ invoice_number: string }>(
            "SELECT invoice_number FROM accounting_invoices WHERE accounting_move_id = ? AND deleted_at IS NULL",
            [moveId]
        );
        if (linkedInvoice) {
            return NextResponse.json(
                { error: `لا يمكن تعديل هذا القيد مباشرة لأنه مرتبط بالفاتورة رقم ${linkedInvoice.invoice_number}. يرجى إلغاء أو تعديل الفاتورة أولاً لكي يتم تعديل القيد تلقائياً.` },
                { status: 400 }
            );
        }

        // Check if linked to an active payment
        const linkedPayment = await queryOne<{ payment_number: string }>(
            "SELECT payment_number FROM accounting_payments WHERE payment_number = SUBSTRING(?, 10) AND deleted_at IS NULL",
            [move.ref] // move.ref looks like "Payment: PAY-2026-0001"
        );
        if (linkedPayment && move.ref?.startsWith("Payment: ")) {
            return NextResponse.json(
                { error: `لا يمكن تعديل هذا القيد مباشرة لأنه مرتبط بالسند رقم ${linkedPayment.payment_number}. يرجى تعديل السند أولاً.` },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { journal_id, date, ref, narration, partner_id, attachment_url, lines } = body;

        // Validation
        if (!journal_id || !date || !lines || !Array.isArray(lines) || lines.length < 2) {
            return NextResponse.json(
                { error: "Invalid entry. Must have journal, date, and at least 2 lines." },
                { status: 400 }
            );
        }

        // Validate Balance (Debit == Credit)
        const totalDebit = lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return NextResponse.json(
                { error: `Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}` },
                { status: 400 }
            );
        }

        await executeTransaction(async (conn) => {
            // 1. Update Header
            await conn.execute(
                `UPDATE accounting_moves 
                 SET journal_id = ?, date = ?, ref = ?, narration = ?, partner_id = ?, amount_total = ?, attachment_url = ?, updated_at = NOW()
                 WHERE id = ?`,
                [journal_id, date, ref || null, narration || null, partner_id || null, totalDebit, attachment_url || null, moveId]
            );

            // 2. Delete existing lines
            await conn.execute("DELETE FROM accounting_move_lines WHERE move_id = ?", [moveId]);

            // 3. Re-insert updated lines
            for (const line of lines) {
                await conn.execute(
                    `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, cost_center_id, name, debit, credit, date_maturity)
                     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        moveId,
                        line.account_id,
                        line.partner_id || partner_id || null,
                        line.cost_center_id || null,
                        line.name || narration || null,
                        line.debit || 0,
                        line.credit || 0,
                        line.date_maturity || null
                    ]
                );
            }

            // 4. Audit Log
            await conn.execute(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'update', 'move', ?, ?)`,
                [user.id, moveId, JSON.stringify({ amount: totalDebit, ref, old_amount: move.amount_total })]
            );
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating move:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
