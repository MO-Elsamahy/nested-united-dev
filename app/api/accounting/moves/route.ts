import { NextResponse } from "next/server";
import { query, execute, generateUUID, queryOne } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: List journal entries (moves) with filtering
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const journalId = searchParams.get("journal_id");
    const state = searchParams.get("state");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const partnerId = searchParams.get("partner_id");

    let sql = `
    SELECT m.*, j.name as journal_name, p.name as partner_name, u.name as created_by_name
    FROM accounting_moves m
    LEFT JOIN accounting_journals j ON m.journal_id = j.id
    LEFT JOIN accounting_partners p ON m.partner_id = p.id
    LEFT JOIN users u ON m.created_by = u.id
    WHERE m.deleted_at IS NULL
  `;
    const params: any[] = [];

    if (journalId) {
        sql += " AND m.journal_id = ?";
        params.push(journalId);
    }
    if (state) {
        sql += " AND m.state = ?";
        params.push(state);
    }
    if (partnerId) {
        sql += " AND m.partner_id = ?";
        params.push(partnerId);
    }
    if (from) {
        sql += " AND m.date >= ?";
        params.push(from);
    }
    if (to) {
        sql += " AND m.date <= ?";
        params.push(to);
    }

    sql += " ORDER BY m.date DESC, m.created_at DESC LIMIT 100";

    try {
        const moves = await query(sql, params);
        return NextResponse.json(moves);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a complete Journal Entry (Header + Lines)
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { journal_id, date, ref, narration, partner_id, attachment_url, lines } = body;

        // Validation
        if (!journal_id || !date || !lines || !Array.isArray(lines) || lines.length < 2) {
            return NextResponse.json(
                { error: "Invalid entry. Must have journal, date, and at least 2 lines." },
                { status: 400 }
            );
        }

        // Validate Balance (Debit == Credit)
        const totalDebit = lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
        const totalCredit = lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

        // Allow slight float precision difference
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return NextResponse.json(
                { error: `Entry is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}` },
                { status: 400 }
            );
        }

        const moveId = generateUUID();
        const userId = session.user.id;

        // 1. Create Header
        await execute(
            `INSERT INTO accounting_moves (id, journal_id, date, ref, narration, state, partner_id, amount_total, attachment_url, created_by)
       VALUES (?, ?, ?, ?, ?, 'posted', ?, ?, ?, ?)`,
            [moveId, journal_id, date, ref, narration, partner_id || null, totalDebit, attachment_url || null, userId]
        );

        // 2. Create Lines
        for (const line of lines) {
            await execute(
                `INSERT INTO accounting_move_lines (id, move_id, account_id, partner_id, cost_center_id, name, debit, credit, date_maturity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    generateUUID(),
                    moveId,
                    line.account_id,
                    line.partner_id || partner_id || null, // Fallback to header partner
                    line.cost_center_id || null, // NEW: Cost Center
                    line.name || narration, // Fallback to header narration
                    line.debit || 0,
                    line.credit || 0,
                    line.date_maturity || null
                ]
            );
        }


        // 3. Audit Log
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'create', 'move', ?, ?)`,
            [generateUUID(), userId, moveId, JSON.stringify({ amount: totalDebit, ref })]
        );

        return NextResponse.json({ success: true, id: moveId }, { status: 201 });
    } catch (error: any) {
        console.error("Move creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Soft Delete a Move
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Check if exists
        const move = await queryOne("SELECT * FROM accounting_moves WHERE id = ?", [id]);
        if (!move) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Soft Delete
        await execute("UPDATE accounting_moves SET deleted_at = NOW() WHERE id = ?", [id]);

        // Audit Log
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'delete', 'move', ?, ?)`,
            [generateUUID(), session.user.id, id, JSON.stringify({ old_amount: move.amount_total })]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
