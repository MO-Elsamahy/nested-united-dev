import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { canAccessCrmReportsAndSettings } from "@/lib/crm-admin";
import { CrmTag } from "@/lib/types/crm";

// GET: List all tags
export async function GET(_request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    try {
        const tags = await query<CrmTag>("SELECT * FROM crm_tags ORDER BY name");
        return NextResponse.json(tags);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create new tag
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

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
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Remove tag
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    const role = (user as { role?: string }).role;
    if (!canAccessCrmReportsAndSettings(role)) {
        return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
        }

        await execute("DELETE FROM crm_tags WHERE id = ?", [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
