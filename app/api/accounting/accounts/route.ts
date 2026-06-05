import { NextResponse } from "next/server";
import { query, execute, generateUUID } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AccountingAccount } from "@/lib/types/accounting";
import { hasSystemAccess } from "@/lib/permissions";

// GET: List all accounts
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const hasAccess = await hasSystemAccess(user.role, "accounting");
    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: No access to accounting accounts" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    let sql = "SELECT * FROM accounting_accounts WHERE deleted_at IS NULL";
    const params: (string | number)[] = [];

    if (type) {
        sql += " AND type = ?";
        params.push(type);
    }

    sql += " ORDER BY code ASC";

    try {
        const accounts = await query<AccountingAccount>(sql, params);
        return NextResponse.json(accounts);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Soft Delete Account
export async function DELETE(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    const hasAccess = await hasSystemAccess(user.role, "accounting");
    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: Cannot delete accounting accounts" }, { status: 403 });
    }

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
            [generateUUID(), user.id, 'delete', 'account', id, JSON.stringify({})]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new account
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const hasAccess = await hasSystemAccess(user.role, "accounting");
    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: Cannot create accounting accounts" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { code, name, type, account_subtype, is_reconcilable, description } = body;

        // Basic validation
        if (!code || !name || !type) {
            return NextResponse.json(
                { error: "Missing required fields (code, name, type)" },
                { status: 400 }
            );
        }

        // account_subtype مسموح فقط على حسابات asset_bank
        const resolvedSubtype = type === "asset_bank" ? (account_subtype || null) : null;

        // Check strict code uniqueness
        const existing = await query("SELECT id FROM accounting_accounts WHERE code = ?", [code]);
        if (existing.length > 0) {
            return NextResponse.json({ error: "رمز الحساب موجود مسبقاً" }, { status: 409 });
        }

        const id = generateUUID();
        await execute(
            `INSERT INTO accounting_accounts (id, code, name, type, account_subtype, is_reconcilable, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, code, name, type, resolvedSubtype, is_reconcilable || false, description || null]
        );

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// PATCH: Update account_subtype (treasury vs bank classification)
export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

    const hasAccess = await hasSystemAccess(user.role, "accounting");
    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden: Cannot update accounting accounts" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, account_subtype } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const validSubtypes = ["cash", "bank", null];
        if (!validSubtypes.includes(account_subtype)) {
            return NextResponse.json({ error: "account_subtype يجب أن يكون: cash, bank, أو null" }, { status: 400 });
        }

        await execute(
            `UPDATE accounting_accounts SET account_subtype = ? WHERE id = ? AND type = 'asset_bank'`,
            [account_subtype, id]
        );

        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'update_subtype', 'account', ?, ?)`,
            [generateUUID(), user.id, id, JSON.stringify({ account_subtype })]
        );

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
