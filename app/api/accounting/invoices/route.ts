import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET /api/accounting/invoices - List all invoices with filters
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const partnerIdFilter = searchParams.get("partner_id");
        const stateFilter = searchParams.get("state");
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");
        const type = searchParams.get("type") || "customer_invoice";

        let sql = `
            SELECT 
                i.*,
                p.name as partner_name,
                p.email as partner_email,
                p.phone as partner_phone
            FROM accounting_invoices i
            LEFT JOIN accounting_partners p ON i.partner_id = p.id
            WHERE i.deleted_at IS NULL
            AND i.invoice_type = ?
        `;

        const params: any[] = [type];

        if (partnerIdFilter) {
            sql += ` AND i.partner_id = ?`;
            params.push(partnerIdFilter);
        }

        if (stateFilter) {
            sql += ` AND i.state = ?`;
            params.push(stateFilter);
        }

        if (startDate) {
            sql += ` AND i.invoice_date >= ?`;
            params.push(startDate);
        }

        if (endDate) {
            sql += ` AND i.invoice_date <= ?`;
            params.push(endDate);
        }

        sql += ` ORDER BY i.invoice_date DESC, i.created_at DESC`;

        const invoices = await query(sql, params);

        return NextResponse.json(invoices);
    } catch (error: any) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json(
            { error: "Failed to fetch invoices", details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/accounting/invoices - Create new invoice (draft)
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            invoice_type = "customer_invoice",
            partner_id,
            invoice_date,
            due_date,
            reference,
            notes,
            payment_terms,
            lines, // Array of invoice lines
        } = body;

        // Validation
        if (!partner_id || !invoice_date || !due_date || !lines || lines.length === 0) {
            return NextResponse.json(
                { error: "Missing required fields: partner_id, invoice_date, due_date, lines" },
                { status: 400 }
            );
        }

        // Get company settings for invoice numbering
        const settings: any = await query(
            "SELECT * FROM company_settings LIMIT 1"
        );

        if (!settings || settings.length === 0) {
            return NextResponse.json(
                { error: "Company settings not found. Please configure company settings first." },
                { status: 400 }
            );
        }

        const companySettings = settings[0];
        const currentYear = new Date().getFullYear();
        const invoiceNumber = `${companySettings.invoice_number_prefix}-${currentYear}-${String(companySettings.next_invoice_number).padStart(4, "0")}`;

        // Calculate totals from lines
        let subtotal = 0;
        let taxAmount = 0;
        let discountAmount = 0;

        const processedLines = lines.map((line: any) => {
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

            return {
                ...line,
                subtotal: lineSubtotal.toFixed(2),
                line_total: lineTotalBeforeTax.toFixed(2),
                tax_amount: lineTax.toFixed(2),
                line_total_with_tax: lineTotalWithTax.toFixed(2),
            };
        });

        const totalAmount = subtotal - discountAmount + taxAmount;
        const invoiceId = uuidv4();

        // Insert invoice
        await query(
            `INSERT INTO accounting_invoices (
                id, invoice_number, invoice_type, partner_id,
                invoice_date, due_date, subtotal, tax_amount,
                discount_amount, total_amount, amount_paid, amount_due,
                state, reference, notes, payment_terms, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'draft', ?, ?, ?, ?)`,
            [
                invoiceId,
                invoiceNumber,
                invoice_type,
                partner_id,
                invoice_date,
                due_date,
                subtotal.toFixed(2),
                taxAmount.toFixed(2),
                discountAmount.toFixed(2),
                totalAmount.toFixed(2),
                totalAmount.toFixed(2), // amount_due = total for new invoices
                reference,
                notes,
                payment_terms,
                session.user.id,
            ]
        );

        // Insert invoice lines
        for (const line of processedLines) {
            await query(
                `INSERT INTO accounting_invoice_lines (
                    id, invoice_id, description, product_id, quantity,
                    unit_price, discount_type, discount_value, tax_rate,
                    tax_amount, account_id, subtotal, line_total, line_total_with_tax
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    invoiceId,
                    line.description,
                    line.product_id || null,
                    line.quantity,
                    line.unit_price,
                    line.discount_type || "percentage",
                    line.discount_value || 0,
                    line.tax_rate || 0,
                    line.tax_amount,
                    line.account_id || null,
                    line.subtotal,
                    line.line_total,
                    line.line_total_with_tax,
                ]
            );
        }

        // Update next invoice number in company settings
        await query(
            "UPDATE company_settings SET next_invoice_number = next_invoice_number + 1 WHERE id = ?",
            [companySettings.id]
        );

        // Fetch the created invoice with partner details
        const createdInvoice: any = await query(
            `SELECT i.*, p.name as partner_name
             FROM accounting_invoices i
             LEFT JOIN accounting_partners p ON i.partner_id = p.id
             WHERE i.id = ?`,
            [invoiceId]
        );

        return NextResponse.json(createdInvoice[0], { status: 201 });
    } catch (error: any) {
        console.error("Error creating invoice:", error);
        return NextResponse.json(
            { error: "Failed to create invoice", details: error.message },
            { status: 500 }
        );
    }
}
