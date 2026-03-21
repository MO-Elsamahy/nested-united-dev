import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, queryOne } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET: List all tags
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const tags = await query("SELECT * FROM crm_tags ORDER BY name");
        return NextResponse.json(tags);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create new tag
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { name, color, text_color } = body;

        if (!name) {
            return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
        }

        const id = uuidv4();
        await execute(
            "INSERT INTO crm_tags (id, name, color, text_color) VALUES (?, ?, ?, ?)",
            [id, name, color || 'bg-gray-100', text_color || 'text-gray-700']
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove tag
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
        }

        await execute("DELETE FROM crm_tags WHERE id = ?", [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
