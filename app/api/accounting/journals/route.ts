import { NextResponse } from "next/server";
import { query, execute, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: List all journals
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const journals = await query("SELECT * FROM accounting_journals ORDER BY name ASC");
        return NextResponse.json(journals);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Soft Delete Journal
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await execute("UPDATE accounting_journals SET deleted_at = NOW() WHERE id = ?", [id]);

        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [generateUUID(), session.user.id, 'delete', 'journal', id, JSON.stringify({})]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new journal
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, code, type, default_account_id } = body;

        if (!name || !code || !type) {
            return NextResponse.json(
                { error: "Missing required fields (name, code, type)" },
                { status: 400 }
            );
        }

        const id = generateUUID();
        await execute(
            `INSERT INTO accounting_journals (id, name, code, type, default_account_id)
       VALUES (?, ?, ?, ?, ?)`,
            [id, name, code, type, default_account_id || null]
        );

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
