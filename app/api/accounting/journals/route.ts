import { NextResponse } from "next/server";
import { query, execute, generateUUID } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AccountingJournal } from "@/lib/types/accounting";

// GET: List all journals
export async function GET(_request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    try {
        const journals = await query<AccountingJournal>("SELECT * FROM accounting_journals WHERE deleted_at IS NULL ORDER BY name ASC");
        return NextResponse.json(journals);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Soft Delete Journal
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    try {
        const isAdmin = user.role === "super_admin" || user.role === "admin" || user.role === "accountant";
        
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden. Only admins and accountants can delete journals." }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await execute("UPDATE accounting_journals SET deleted_at = NOW() WHERE id = ?", [id]);

        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [generateUUID(), user.id, 'delete', 'journal', id, JSON.stringify({})]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Update a journal
export async function PUT(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    try {
        const isAdmin = user.role === "super_admin" || user.role === "admin" || user.role === "accountant";
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden: Accounting access required" }, { status: 403 });
        }

        const body = await request.json();
        const { id, name, code, type, default_account_id } = body;

        if (!id || !name || !code || !type) {
            return NextResponse.json({ error: "يرجى تعبئة جميع الحقول المطلوبة" }, { status: 400 });
        }

        await execute(
            `UPDATE accounting_journals SET name = ?, code = ?, type = ?, default_account_id = ? WHERE id = ?`,
            [name, code, type, default_account_id || null, id]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new journal
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    try {
        const isAdmin = user.role === "super_admin" || user.role === "admin" || user.role === "accountant";
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden: Accounting access required" }, { status: 403 });
        }

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
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
