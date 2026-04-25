import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { canAccessCrmReportsAndSettings } from "@/lib/crm-admin";

function assertCrmSettingsRole(session: { user: unknown } | null) {
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as { role?: string }).role;
    if (!canAccessCrmReportsAndSettings(role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return null;
}

// GET: List custom stages
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    const denied = assertCrmSettingsRole(session);
    if (denied) return denied;

    try {
        const stages = await query("SELECT * FROM crm_custom_stages WHERE is_active = 1 ORDER BY stage_order");
        return NextResponse.json(stages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create custom stage
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    const denied = assertCrmSettingsRole(session);
    if (denied) return denied;

    try {
        const body = await request.json();
        const { label, stage_key, color, stage_order } = body;

        if (!label || !stage_key) {
            return NextResponse.json({ error: "Label and stage_key are required" }, { status: 400 });
        }

        const id = uuidv4();
        await execute(
            "INSERT INTO crm_custom_stages (id, label, stage_key, color, stage_order) VALUES (?, ?, ?, ?, ?)",
            [id, label, stage_key, color || 'bg-gray-100', stage_order || 99]
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update stage
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    const denied = assertCrmSettingsRole(session);
    if (denied) return denied;

    try {
        const body = await request.json();
        const { id, label, color, stage_order } = body;

        if (!id) {
            return NextResponse.json({ error: "Stage ID required" }, { status: 400 });
        }

        await execute(
            "UPDATE crm_custom_stages SET label = ?, color = ?, stage_order = ? WHERE id = ?",
            [label, color, stage_order, id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Deactivate stage
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    const denied = assertCrmSettingsRole(session);
    if (denied) return denied;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Stage ID required" }, { status: 400 });
        }

        // Soft delete
        await execute("UPDATE crm_custom_stages SET is_active = 0 WHERE id = ?", [id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
