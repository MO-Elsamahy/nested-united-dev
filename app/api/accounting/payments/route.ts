import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET /api/accounting/payments - List payments
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const partnerId = searchParams.get("partner_id");

        let sql = `
            SELECT p.*, pr.name as partner_name
            FROM accounting_payments p
            LEFT JOIN accounting_partners pr ON p.partner_id = pr.id
            WHERE p.deleted_at IS NULL
        `;
        const params: any[] = [];

        if (partnerId) {
            sql += ` AND p.partner_id = ?`;
            params.push(partnerId);
        }

        sql += ` ORDER BY p.payment_date DESC`;

        const payments = await query(sql, params);
        return NextResponse.json(payments);
    } catch (error: any) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "Failed to fetch payments", details: error.message },
            { status: 500 }
        );
    }
}

// POST /api/accounting/payments - Register payment
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            partner_id,
            payment_date,
            amount,
            payment_method,
            reference,
            journal_id,
            notes,
            invoice_allocations, // [{ invoice_id, amount }]
        } = body;

        if (!partner_id || !payment_date || !amount || !payment_method || !journal_id) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get company settings for payment numbering
        const settings: any = await query("SELECT * FROM company_settings LIMIT 1");
        if (!settings || settings.length === 0) {
            return NextResponse.json({ error: "Company settings not found" }, { status: 400 });
        }

        const companySettings = settings[0];
        const currentYear = new Date().getFullYear();
        const paymentNumber = `${companySettings.payment_number_prefix}-${currentYear}-${String(companySettings.next_payment_number).padStart(4, "0")}`;

        const paymentId = uuidv4();

        // Insert payment
        await query(
            `INSERT INTO accounting_payments (
                id, payment_number, payment_date, amount, payment_method,
                reference, partner_id, journal_id, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                paymentId,
                paymentNumber,
                payment_date,
                amount,
                payment_method,
                reference,
                partner_id,
                journal_id,
                notes,
                session.user.id,
            ]
        );

        // Allocate payment to invoices
        if (invoice_allocations && invoice_allocations.length > 0) {
            for (const allocation of invoice_allocations) {
                await query(
                    `INSERT INTO accounting_payment_allocations (
                        id, payment_id, invoice_id, amount
                    ) VALUES (?, ?, ?, ?)`,
                    [uuidv4(), paymentId, allocation.invoice_id, allocation.amount]
                );

                // Update invoice amounts
                await query(
                    `UPDATE accounting_invoices SET
                        amount_paid = amount_paid + ?,
                        amount_due = amount_due - ?,
                        state = CASE
                            WHEN amount_due - ? <= 0 THEN 'paid'
                            WHEN amount_paid + ? > 0 THEN 'partial'
                            ELSE state
                        END
                     WHERE id = ?`,
                    [
                        allocation.amount,
                        allocation.amount,
                        allocation.amount,
                        allocation.amount,
                        allocation.invoice_id,
                    ]
                );
            }
        }

        // Update next payment number
        await query(
            "UPDATE company_settings SET next_payment_number = next_payment_number + 1 WHERE id = ?",
            [companySettings.id]
        );

        const created: any = await query(
            `SELECT p.*, pr.name as partner_name
             FROM accounting_payments p
             LEFT JOIN accounting_partners pr ON p.partner_id = pr.id
             WHERE p.id = ?`,
            [paymentId]
        );

        return NextResponse.json(created[0], { status: 201 });
    } catch (error: any) {
        console.error("Error creating payment:", error);
        return NextResponse.json(
            { error: "Failed to create payment", details: error.message },
            { status: 500 }
        );
    }
}
