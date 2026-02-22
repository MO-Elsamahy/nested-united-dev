import { NextResponse } from "next/server";
import { execute, query, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // Filter by deleted_at IS NULL
        const rows = await query("SELECT * FROM accounting_partners WHERE deleted_at IS NULL ORDER BY name ASC");
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const id = generateUUID();

        await execute(
            `INSERT INTO accounting_partners (id, name, email, phone, type, tax_id, address) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, body.name, body.email || null, body.phone || null, body.type, body.tax_id || null, body.address || null]
        );

        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, 'create', 'partner', ?, ?)`,
            [generateUUID(), session.user.id, 'create', 'partner', id, JSON.stringify({ name: body.name })]
        );

        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await execute("UPDATE accounting_partners SET deleted_at = NOW() WHERE id = ?", [id]);

        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'delete', 'partner', ?, ?)`,
            [generateUUID(), session.user.id, 'delete', 'partner', id, JSON.stringify({})]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
