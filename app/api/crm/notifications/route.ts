import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query, execute } from "@/lib/db";

// GET: Get user's notifications
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get("unread") === "true";

        let sql = "SELECT * FROM crm_notifications WHERE user_id = ?";
        if (unreadOnly) {
            sql += " AND is_read = 0";
        }
        sql += " ORDER BY created_at DESC LIMIT 50";

        const notifications = await query(sql, [user.id]);
        return NextResponse.json(notifications);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Mark notification as read
export async function PUT(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { id, markAllRead } = body;

        if (markAllRead) {
            await execute("UPDATE crm_notifications SET is_read = 1 WHERE user_id = ?", [user.id]);
        } else if (id) {
            await execute("UPDATE crm_notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, user.id]);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
