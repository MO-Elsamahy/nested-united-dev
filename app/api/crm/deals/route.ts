import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, queryOne } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET: List deals (with optional filters)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'open';

        const deals = await query(
            `SELECT d.*, c.full_name as customer_name 
             FROM crm_deals d 
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.status = ?
             ORDER BY d.created_at DESC`,
            [status]
        );

        return NextResponse.json(deals);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create Deal
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { customer_id, title, description, stage, value } = body;

        if (!customer_id || !title) {
            return NextResponse.json({ error: "customer_id and title are required" }, { status: 400 });
        }

        const id = uuidv4();
        await execute(
            "INSERT INTO crm_deals (id, customer_id, title, description, stage, value, status) VALUES (?, ?, ?, ?, ?, ?, 'open')",
            [id, customer_id, title, description, stage || 'new', value || 0]
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Deal Stage or Status
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, stage, status } = body;

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        // Use queryOne for cleaner single row fetching
        const oldDeal = await queryOne<any>("SELECT stage, status, customer_id FROM crm_deals WHERE id = ?", [id]);

        // Build dynamic update
        const updates = [];
        const params = [];

        if (stage) { updates.push('stage = ?'); params.push(stage); }
        if (status) { updates.push('status = ?'); params.push(status); }

        params.push(id);

        await execute(`UPDATE crm_deals SET ${updates.join(', ')} WHERE id = ?`, params);

        // Log Changes
        if (stage && oldDeal && oldDeal.stage !== stage) {
            const actId = uuidv4();
            await execute(`
                INSERT INTO crm_activities (id, customer_id, deal_id, type, title, description, performed_by)
                VALUES (?, ?, ?, 'status_change', 'تغيير مرحلة', ?, ?)
            `, [actId, oldDeal.customer_id, id, `تم تغيير حالة الصفقة من ${oldDeal.stage} إلى ${stage}`, session.user.id]);
        }

        if (status && oldDeal && oldDeal.status !== status) {
            const actId = uuidv4();
            const desc = status === 'closed' ? 'تم إغلاق الصفقة' : 'إعادة فتح الصفقة';
            await execute(`
               INSERT INTO crm_activities (id, customer_id, deal_id, type, title, description, performed_by)
               VALUES (?, ?, ?, 'status_change', ?, ?, ?)
           `, [actId, oldDeal.customer_id, id, desc, desc, session.user.id]);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove Deal
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Deal ID required" }, { status: 400 });
        }

        await execute("DELETE FROM crm_deals WHERE id = ?", [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
