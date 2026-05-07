
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query, execute, generateUUID } from "@/lib/db";
import { hasSystemAccess } from "@/lib/permissions";

// GET: List all announcements
export async function GET(_request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Admins see all. Employees see only active.
        // Ideally we check role. For now, let's return all for the admin page management.
        // The employee dashboard query filters by 'active' and 'expires_at'.

        const announcements = await query<{ id: string, title: string, content: string, priority: string, is_pinned: boolean | number, created_at: string, published_at: string, created_by_name?: string }>(`
        SELECT a.*, u.name as created_by_name 
        FROM hr_announcements a
        LEFT JOIN users u ON a.created_by = u.id
        ORDER BY a.is_pinned DESC, a.created_at DESC
    `);

        return NextResponse.json(announcements);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new announcement
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await hasSystemAccess(user.role, "hr");
    if (!hasAccess) {
        return NextResponse.json({ error: "ليس لديك صلاحية لإدارة الإعلانات" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { title, content, priority, is_pinned, expires_at } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
        }

        const id = generateUUID();

        await execute(
            `INSERT INTO hr_announcements (id, title, content, priority, is_pinned, expires_at, created_by, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [id, title, content, priority || "normal", is_pinned ? 1 : 0, expires_at || null, user.id]
        );

        return NextResponse.json({ success: true, id });

    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Update an announcement
export async function PUT(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await hasSystemAccess(user.role, "hr");
    if (!hasAccess) {
        return NextResponse.json({ error: "ليس لديك صلاحية لإدارة الإعلانات" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, title, content, priority, is_pinned, expires_at } = body;

        if (!id || !title || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await execute(
            `UPDATE hr_announcements 
             SET title = ?, content = ?, priority = ?, is_pinned = ?, expires_at = ? 
             WHERE id = ?`,
            [title, content, priority || "normal", is_pinned ? 1 : 0, expires_at || null, id]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Delete an announcement
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await hasSystemAccess(user.role, "hr");
    if (!hasAccess) {
        return NextResponse.json({ error: "ليس لديك صلاحية لإدارة الإعلانات" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await execute("DELETE FROM hr_announcements WHERE id = ?", [id]);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
