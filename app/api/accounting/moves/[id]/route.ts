import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

/** GET: single journal entry (header + lines with account names) */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
        const move = await queryOne<any>(
            `SELECT m.*, j.name AS journal_name, j.code AS journal_code,
                    p.name AS partner_name, u.name AS created_by_name
             FROM accounting_moves m
             LEFT JOIN accounting_journals j ON m.journal_id = j.id
             LEFT JOIN accounting_partners p ON m.partner_id = p.id
             LEFT JOIN users u ON m.created_by = u.id
             WHERE m.id = ? AND m.deleted_at IS NULL`,
            [id]
        );

        if (!move) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const lines = await query(
            `SELECT l.id, l.move_id, l.account_id, l.name, l.debit, l.credit, l.date_maturity,
                    a.code AS account_code, a.name AS account_name
             FROM accounting_move_lines l
             LEFT JOIN accounting_accounts a ON l.account_id = a.id
             WHERE l.move_id = ?
             ORDER BY l.debit DESC, l.credit DESC, l.id`,
            [id]
        );

        return NextResponse.json({ move, lines });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
