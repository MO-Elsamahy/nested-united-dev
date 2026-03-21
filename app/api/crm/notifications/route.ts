import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";

// GET: Get user's notifications
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get("unread") === "true";

        let sql = "SELECT * FROM crm_notifications WHERE user_id = ?";
        if (unreadOnly) {
            sql += " AND is_read = 0";
        }
        sql += " ORDER BY created_at DESC LIMIT 50";

        const notifications = await query(sql, [session.user.id]);
        return NextResponse.json(notifications);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Mark notification as read
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, markAllRead } = body;

        if (markAllRead) {
            await execute("UPDATE crm_notifications SET is_read = 1 WHERE user_id = ?", [session.user.id]);
        } else if (id) {
            await execute("UPDATE crm_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, session.user.id]);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
