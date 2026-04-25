import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute } from "@/lib/db";

// GET /api/crm/deals/[id] — Get single deal with activities
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        // Get deal with customer info
        const deal = await queryOne<any>(
            `SELECT d.*, c.full_name as customer_name, c.phone as customer_phone, c.email as customer_email
             FROM crm_deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.id = ?`,
            [id]
        );

        if (!deal) {
            return NextResponse.json({ error: "Deal not found" }, { status: 404 });
        }

        // Get assigned user name
        if (deal.assigned_to) {
            const assignedUser = await queryOne<{ name: string }>(
                "SELECT name FROM users WHERE id = ?",
                [deal.assigned_to]
            );
            deal.assigned_to_name = assignedUser?.name || null;
        }

        // Get activities for this deal (with user names)
        const activities = await query<any>(
            `SELECT a.*, u.name as performed_by_name
             FROM crm_activities a
             LEFT JOIN users u ON a.performed_by = u.id
             WHERE a.deal_id = ?
             ORDER BY a.performed_at DESC`,
            [id]
        );

        return NextResponse.json({ deal, activities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/crm/deals/[id] — Remove deal and its activities
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const existing = await queryOne<{ id: string }>("SELECT id FROM crm_deals WHERE id = ?", [id]);
        if (!existing) {
            return NextResponse.json({ error: "Deal not found" }, { status: 404 });
        }

        await execute("DELETE FROM crm_activities WHERE deal_id = ?", [id]);
        await execute("DELETE FROM crm_deals WHERE id = ?", [id]);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
