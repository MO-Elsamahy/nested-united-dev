import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute } from "@/lib/db";

// PUT: Update an announcement
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;
        const body = await request.json();
        const { title, content, priority, is_pinned, expires_at } = body;

        if (!title || !content) {
            return NextResponse.json({ error: "العنوان والمحتوى مطلوبان" }, { status: 400 });
        }

        await execute(
            `UPDATE hr_announcements 
             SET title = ?, content = ?, priority = ?, is_pinned = ?, expires_at = ?
             WHERE id = ?`,
            [title, content, priority || "normal", is_pinned ? 1 : 0, expires_at || null, id]
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Delete an announcement
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await params;

        await execute("DELETE FROM hr_announcements WHERE id = ?", [id]);

        return NextResponse.json({ success: true });

    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
