import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

// GET /api/accounting/invoices/[id] - Get invoice details
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        // Get invoice with partner details
        const invoices: any = await query(
            `SELECT i.*, p.name as partner_name, p.email as partner_email,
                    p.phone as partner_phone, p.address, p.vat_number as partner_vat
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ? AND i.deleted_at IS NULL`,
            [invoiceId]
        );

        if (!invoices || invoices.length === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const invoice = invoices[0];

        // Get invoice lines
        const lines = await query(
            `SELECT * FROM accounting_invoice_lines WHERE invoice_id = ? ORDER BY created_at`,
            [invoiceId]
        );

        // Get payment allocations
        const payments: any = await query(
            `SELECT pa.*, p.payment_number, p.payment_date, p.payment_method
             FROM accounting_payment_allocations pa
             LEFT JOIN accounting_payments p ON pa.payment_id = p.id
             WHERE pa.invoice_id = ?
             ORDER BY p.payment_date DESC`,
            [invoiceId]
        );

        return NextResponse.json({
            ...invoice,
            lines,
            payments,
        });
    } catch (error: any) {
        console.error("Error fetching invoice:", error);
        return NextResponse.json(
            { error: "Failed to fetch invoice", details: error.message },
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
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;
        const body = await req.json();

        // Check if invoice exists and is editable
        const existing: any = await query(
            "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL",
            [invoiceId]
        );

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const invoice = existing[0];

        // Only allow editing draft invoices
        if (invoice.state !== "draft") {
            return NextResponse.json(
                { error: "Only draft invoices can be edited" },
                { status: 400 }
            );
        }

        const {
            partner_id,
            invoice_date,
            due_date,
            reference,
            notes,
            payment_terms,
            lines,
        } = body;

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
                invoiceId,
            ]
        );

        // Fetch updated invoice
        const updated: any = await query(
            `SELECT i.*, p.name as partner_name
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ?`,
            [invoiceId]
        );

        return NextResponse.json(updated[0]);
    } catch (error: any) {
        console.error("Error updating invoice:", error);
        return NextResponse.json(
            { error: "Failed to update invoice", details: error.message },
            { status: 500 }
        );
    }
}

// DELETE /api/accounting/invoices/[id] - Soft delete invoice
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: invoiceId } = await context.params;

        // Check if invoice exists
        const existing: any = await query(
            "SELECT * FROM accounting_invoices WHERE id = ? AND deleted_at IS NULL",
            [invoiceId]
        );

        if (!existing || existing.length === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        const invoice = existing[0];

        // Only allow deleting draft invoices
        if (invoice.state !== "draft") {
            return NextResponse.json(
                { error: "Only draft invoices can be deleted" },
                { status: 400 }
            );
        }

        // Soft delete
        await query(
            "UPDATE accounting_invoices SET deleted_at = NOW() WHERE id = ?",
            [invoiceId]
        );

        return NextResponse.json({ message: "Invoice deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting invoice:", error);
        return NextResponse.json(
            { error: "Failed to delete invoice", details: error.message },
            { status: 500 }
        );
    }
}
