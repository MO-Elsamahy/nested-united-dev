
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, generateUUID } from "@/lib/db";

// GET: List all announcements
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Admins see all. Employees see only active.
        // Ideally we check role. For now, let's return all for the admin page management.
        // The employee dashboard query filters by 'active' and 'expires_at'.

        const announcements = await query(`
        SELECT a.*, u.name as created_by_name 
        FROM hr_announcements a
        LEFT JOIN users u ON a.created_by = u.id
        ORDER BY a.is_pinned DESC, a.created_at DESC
    `);

        return NextResponse.json(announcements);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new announcement
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
            [id, title, content, priority || "normal", is_pinned ? 1 : 0, expires_at || null, session.user.id]
        );

        return NextResponse.json({ success: true, id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Deactivate/Delete announcement (Optional, via query param or simple ID check if implemented)
// We'll keep it simple for now or add a separate dynamic route if needed.
// Let's implement active toggle via PUT if needed later.
