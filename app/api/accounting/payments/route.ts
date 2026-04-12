import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

// GET /api/accounting/payments - List all receipts and payments
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // inbound or outbound
        const partnerId = searchParams.get("partner_id");
        const startDate = searchParams.get("start_date");
        const endDate = searchParams.get("end_date");

        let sql = `
            SELECT 
                p.*, 
                ptr.name as partner_name,
                GROUP_CONCAT(i.invoice_number SEPARATOR ', ') as invoices
            FROM accounting_payments p
            LEFT JOIN accounting_partners ptr ON p.partner_id = ptr.id
            LEFT JOIN accounting_payment_allocations pa ON p.id = pa.payment_id
            LEFT JOIN accounting_invoices i ON pa.invoice_id = i.id
            WHERE p.deleted_at IS NULL
        `;

        const params: any[] = [];

        if (type) {
            sql += " AND p.payment_type = ?";
            params.push(type);
        }

        if (partnerId) {
            sql += " AND p.partner_id = ?";
            params.push(partnerId);
        }

        if (startDate) {
            sql += " AND p.payment_date >= ?";
            params.push(startDate);
        }

        if (endDate) {
            sql += " AND p.payment_date <= ?";
            params.push(endDate);
        }

        sql += ` GROUP BY p.id ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 100`;

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
