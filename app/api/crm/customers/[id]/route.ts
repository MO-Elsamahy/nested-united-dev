
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, executeTransaction } from "@/lib/db";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // 1. Get Customer Details
        const customer = await queryOne("SELECT * FROM customers WHERE id = ?", [id]);

        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // 2. Get Recent Activities (Timeline)
        // We join with users to get the name of the person who performed the action
        const activities = await query(`
            SELECT 
                a.*,
                u.name as performed_by_name
            FROM crm_activities a
            LEFT JOIN users u ON a.performed_by = u.id
            WHERE a.customer_id = ?
            ORDER BY a.performed_at DESC
            LIMIT 50
        `, [id]);

        // 3. Open deals for pipeline sidebar; total count for profile badges
        const [deals, dealCountRow] = await Promise.all([
            query(`
            SELECT * FROM crm_deals 
            WHERE customer_id = ? AND status = 'open'
            ORDER BY created_at DESC
        `, [id]),
            queryOne<{ count: number }>(
                `SELECT COUNT(*) as count FROM crm_deals WHERE customer_id = ?`,
                [id]
            ),
        ]);

        const total_deal_count = dealCountRow?.count ?? 0;

        return NextResponse.json({ customer, activities, deals, total_deal_count });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Customer
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { full_name, phone, email, national_id, address, type, notes, status } = body;

        await execute(`
            UPDATE customers 
            SET full_name=?, phone=?, email=?, national_id=?, address=?, type=?, notes=?, status=?
            WHERE id=?
        `, [full_name, phone, email, national_id, address, type, notes, status, id]);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove customer and CRM data linked to them (deals, activities, tags)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const customer = await queryOne<{ id: string }>("SELECT id FROM customers WHERE id = ?", [id]);
        if (!customer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        await executeTransaction(async (conn) => {
            await conn.execute(
                `DELETE a FROM crm_activities a
                 INNER JOIN crm_deals d ON a.deal_id = d.id AND d.customer_id = ?`,
                [id]
            );
            await conn.execute("DELETE FROM crm_activities WHERE customer_id = ?", [id]);
            await conn.execute("DELETE FROM crm_deals WHERE customer_id = ?", [id]);
            await conn.execute("DELETE FROM crm_customer_tags WHERE customer_id = ?", [id]);
            await conn.execute("DELETE FROM customers WHERE id = ?", [id]);
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
