import { NextResponse } from "next/server";
import { execute, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const id = searchParams.get("id");

        if (!id || !type) return NextResponse.json({ error: "Missing params" }, { status: 400 });

        // Validate type to prevent SQL injection or wrong table access
        let table = "";
        if (type === "move") table = "accounting_moves";
        else if (type === "account") table = "accounting_accounts";
        else if (type === "journal") table = "accounting_journals";
        else return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });

        // Restore Logic
        await execute(`UPDATE ${table} SET deleted_at = NULL WHERE id = ?`, [id]);

        // Log the restore action
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
         VALUES (?, ?, 'restore', ?, ?, ?)`,
            [generateUUID(), session.user.id, type, id, JSON.stringify({ restored_at: new Date() })]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
