import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

import { query, queryOne } from "@/lib/db";
import { AccountingInvoice, AccountingInvoiceLine, AccountingPaymentAllocation, AccountingMoveLine } from "@/lib/types/accounting";
import { hasSystemAccess } from "@/lib/permissions";

// GET /api/accounting/invoices/[id] - Get invoice details
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        // Get invoice with partner details
        const invoices = await query<AccountingInvoice>(
            `SELECT i.*, p.name as partner_name, p.email as partner_email,
                    p.phone as partner_phone, p.address, p.tax_id as partner_vat
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ? AND i.deleted_at IS NULL`,
            [invoiceId]
        );

        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
        }

        const invoice = invoices[0];

        // Get invoice lines
        const lines = await query<AccountingInvoiceLine>(
            `SELECT * FROM accounting_invoice_lines WHERE invoice_id = ?`,
            [invoiceId]
        );

        // Get payment allocations (graceful fallback if table doesn't exist yet)
        let payments: AccountingPaymentAllocation[] = [];
        try {
            payments = await query<AccountingPaymentAllocation>(
                `SELECT pa.*, p.payment_number, p.payment_date, p.payment_method
              FROM accounting_payment_allocations pa
              JOIN accounting_payments p ON pa.payment_id = p.id
              WHERE pa.invoice_id = ? AND p.deleted_at IS NULL
              ORDER BY p.payment_date DESC`,
                [invoiceId]
            );
        } catch (_error) {
            // payments tables not yet created — return empty
        }

        return NextResponse.json({
            ...invoice,
            lines,
            payments,
        });
    } catch (error) {
        console.error("Error fetching invoice:", error);
        return NextResponse.json(
            { error: "فشل في جلب الفاتورة", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

// PUT /api/accounting/invoices/[id] - Update invoice
export async function PUT(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;
        const body = await req.json();

        // Check if invoice exists
        const existing = await query<AccountingInvoice>(
            "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL",
            [invoiceId]
        );

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
        }

        const invoice = existing[0];

        const {
            action,
            partner_id,
            invoice_date,
            due_date,
            reference,
            notes,
            payment_terms,
            attachment_url,
            lines,
        } = body;

        // Action: Cancel Invoice (Super Admin or Accountant)
        if (action === "cancel") {
            const hasAccess = await hasSystemAccess(user.role, "accounting");
            if (!hasAccess) {
                return NextResponse.json({ error: "Forbidden. Only authorized staff can cancel invoices." }, { status: 403 });
            }

            if (invoice.state === "draft" || invoice.state === "cancelled") {
                return NextResponse.json({ error: `Cannot cancel invoice in ${invoice.state} state.` }, { status: 400 });
            }

            // 1. Create Reverse Journal Entry if move exists
            if (invoice.accounting_move_id) {
                const moveLines = await query<AccountingMoveLine>("SELECT * FROM accounting_move_lines WHERE move_id = ?", [invoice.accounting_move_id]);
                const newMoveId = crypto.randomUUID();
                
                // Create Header
                await query(
                    `INSERT INTO accounting_moves (id, journal_id, date, ref, narration, state, partner_id, amount_total, created_by)
                     VALUES (?, ?, CURDATE(), ?, ?, 'posted', ?, ?, ?)`,
                    [
                        newMoveId,
                        invoice.journal_id || (await queryOne<AccountingInvoice>("SELECT journal_id FROM accounting_moves WHERE id = ?", [invoice.accounting_move_id]))?.journal_id,
                        `REV-${invoice.invoice_number}`,
                        `إلغاء الفاتورة رقم ${invoice.invoice_number}`,
                        invoice.partner_id,
                        invoice.total_amount,
                        user.id
                    ]
                );

                // Create Reversed Lines (Swap Debit and Credit)
                for (const line of moveLines) {
                    await query(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, name, debit, credit)
                         VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
                        [
                            newMoveId,
                            line.account_id,
                            line.partner_id,
                            `عكس: ${line.name}`,
                            line.credit, // Debit = Old Credit
                            line.debit   // Credit = Old Debit
                        ]
                    );
                }

                // Update invoice to link to both or just mark cancelled?
                // Usually we keep track of the original move.
            }

            // 2. Update Invoice State
            await query("UPDATE accounting_invoices SET state = 'cancelled', updated_at = NOW() WHERE id = ?", [invoiceId]);

            // 3. Audit Log
            await query(
                `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                 VALUES (UUID(), ?, 'cancel', 'invoice', ?, ?)`,
                [user.id, invoiceId, JSON.stringify({ reason: body.reason || "Manual cancellation by admin" })]
            );

            return NextResponse.json({ message: "Invoice cancelled and reversed successfully" });
        }

        // Only allow editing draft or cancelled invoices
        if (invoice.state !== "draft" && invoice.state !== "cancelled") {
            return NextResponse.json(
                { error: "Only draft or cancelled invoices can be edited" },
                { status: 400 }
            );
        }

        // Calculate totals if lines provided
        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;

        if (lines && lines.length > 0) {
            // Delete existing lines
            await query("DELETE FROM accounting_invoice_lines WHERE invoice_id = ?", [invoiceId]);

            // Re-insert lines
            for (const line of lines) {
                const qty = parseFloat(line.quantity) || 1;
                const price = parseFloat(line.unit_price) || 0;
                const lineSubtotal = qty * price;

                let lineDiscount = 0;
                if (line.discount_type === "percentage") {
                    lineDiscount = (lineSubtotal * parseFloat(line.discount_value || 0)) / 100;
                } else {
                    lineDiscount = parseFloat(line.discount_value || 0);
                }

                const lineTotalBeforeTax = lineSubtotal - lineDiscount;
                const taxRate = parseFloat(line.tax_rate || 0);
                const lineTax = (lineTotalBeforeTax * taxRate) / 100;
                const lineTotalWithTax = lineTotalBeforeTax + lineTax;

                subtotal += lineSubtotal;
                discountAmount += lineDiscount;
                taxAmount += lineTax;

                await query(
                    `INSERT INTO accounting_invoice_lines (
                        id, invoice_id, description, product_id, quantity,
                        unit_price, discount_type, discount_value, tax_rate,
                        tax_amount, account_id, subtotal, line_total, line_total_with_tax
                    ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        invoiceId,
                        line.description,
                        line.product_id || null,
                        qty,
                        price,
                        line.discount_type || "percentage",
                        line.discount_value || 0,
                        taxRate,
                        lineTax.toFixed(2),
                        line.account_id || null,
                        lineSubtotal.toFixed(2),
                        lineTotalBeforeTax.toFixed(2),
                        lineTotalWithTax.toFixed(2),
                    ]
                );
            }
        }

        const totalAmount = subtotal - discountAmount + taxAmount;

        // If the invoice was cancelled, reset it to draft and soft-delete the original and reversing moves
        let resetStateSql = "";
        if (invoice.state === "cancelled") {
            if (invoice.accounting_move_id) {
                await query("UPDATE accounting_moves SET deleted_at = NOW() WHERE id = ?", [invoice.accounting_move_id]);
            }
            await query("UPDATE accounting_moves SET deleted_at = NOW() WHERE ref = ?", [`REV-${invoice.invoice_number}`]);

            resetStateSql = ", state = 'draft', accounting_move_id = NULL, amount_paid = 0.00";
        }

        // Update invoice
        await query(
            `UPDATE accounting_invoices SET
                partner_id = COALESCE(?, partner_id),
                invoice_date = COALESCE(?, invoice_date),
                due_date = COALESCE(?, due_date),
                subtotal = ?,
                tax_amount = ?,
                discount_amount = ?,
                total_amount = ?,
                amount_due = ?,
                reference = ?,
                notes = ?,
                payment_terms = ?,
                attachment_url = ?${resetStateSql},
                updated_at = NOW()
             WHERE id = ?`,
            [
                partner_id,
                invoice_date,
                due_date,
                subtotal.toFixed(2),
                taxAmount.toFixed(2),
                discountAmount.toFixed(2),
                totalAmount.toFixed(2),
                totalAmount.toFixed(2), // Recalculate amount_due = total - paid
                reference,
                notes,
                payment_terms,
                attachment_url,
                invoiceId,
            ]
        );

        // Fetch updated invoice
        const updated = await query<AccountingInvoice>(
            `SELECT i.*, p.name as partner_name
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ?`,
            [invoiceId]
        );

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: "Failed to update invoice", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}

// DELETE /api/accounting/invoices/[id] - Soft delete invoice
export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user?.id) {
            return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        // Check if invoice exists
        const existing = await query<AccountingInvoice>(
            "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL",
            [invoiceId]
        );

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
        }

        const invoice = existing[0];

        // Permission Check: Only authorized staff can delete confirmed/paid invoices
        const hasAccess = await hasSystemAccess(user.role, "accounting");
        if (invoice.state !== "draft" && !hasAccess) {
            return NextResponse.json(
                { error: "Forbidden. Confirmed invoices can only be deleted by authorized staff." },
                { status: 403 }
            );
        }

        // 1. Soft-delete the invoice itself
        await query(
            "UPDATE accounting_invoices SET deleted_at = NOW() WHERE id = ?",
            [invoiceId]
        );

        // 2. Soft-delete the invoice's journal entry if it exists
        if (invoice.accounting_move_id) {
            await query(
                "UPDATE accounting_moves SET deleted_at = NOW() WHERE id = ?",
                [invoice.accounting_move_id]
            );
        }

        // 3. Find and clean up payments associated with this invoice
        const allocations = await query<{ payment_id: string }>(
            "SELECT payment_id FROM accounting_payment_allocations WHERE invoice_id = ?",
            [invoiceId]
        );

        if (allocations && allocations.length > 0) {
            const paymentIds = allocations.map(a => a.payment_id);
            for (const pid of paymentIds) {
                // Fetch payment info (specifically the payment number to delete its moves)
                const paymentInfo = await query<{ payment_number: string }>(
                    "SELECT payment_number FROM accounting_payments WHERE id = ? AND deleted_at IS NULL",
                    [pid]
                );
                
                if (paymentInfo && paymentInfo.length > 0) {
                    const payNum = paymentInfo[0].payment_number;
                    // Soft delete the payment
                    await query(
                        "UPDATE accounting_payments SET deleted_at = NOW() WHERE id = ?",
                        [pid]
                    );
                    // Soft delete the payment's move (Payment: PAY-xxxx)
                    await query(
                        "UPDATE accounting_moves SET deleted_at = NOW() WHERE ref = ?",
                        [`Payment: ${payNum}`]
                    );
                }
            }
        }

        // 4. Write Audit Log
        await query(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (UUID(), ?, 'delete', 'invoice', ?, ?)`,
            [
                user.id,
                invoiceId,
                JSON.stringify({
                    invoice_number: invoice.invoice_number,
                    total_amount: invoice.total_amount,
                })
            ]
        );

        return NextResponse.json({ message: "Invoice deleted successfully" });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        return NextResponse.json(
            { error: "Failed to delete invoice", details: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
