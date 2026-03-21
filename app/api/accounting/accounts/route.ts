import { NextResponse } from "next/server";
import { query, execute, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: List all accounts
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let sql = "SELECT * FROM accounting_accounts WHERE deleted_at IS NULL";
    const params: any[] = [];

    if (type) {
        sql += " AND type = ?";
        params.push(type);
    }

    sql += " ORDER BY code ASC";

    try {
        const accounts = await query(sql, params);
        return NextResponse.json(accounts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Soft Delete Account
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Check if used (optional validation: don't delete if has moves? strict/loose?)
        // For now, allow soft delete. Reporting will filter them out but historical data remains linked.

        // Soft Delete
        await execute("UPDATE accounting_accounts SET deleted_at = NOW() WHERE id = ?", [id]);

        // Audit Log
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [generateUUID(), session.user.id, 'delete', 'account', id, JSON.stringify({})]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new account
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { code, name, type, is_reconcilable, description } = body;

        // Basic validation
        if (!code || !name || !type) {
            return NextResponse.json(
                { error: "Missing required fields (code, name, type)" },
                { status: 400 }
            );
        }

        // Check strict code uniqueness
        const existing = await query("SELECT id FROM accounting_accounts WHERE code = ?", [code]);
        if (existing.length > 0) {
            return NextResponse.json({ error: "Account code already exists" }, { status: 409 });
        }

        const id = generateUUID();
        await execute(
            `INSERT INTO accounting_accounts (id, code, name, type, is_reconcilable, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [id, code, name, type, is_reconcilable || false, description || null]
        );

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
