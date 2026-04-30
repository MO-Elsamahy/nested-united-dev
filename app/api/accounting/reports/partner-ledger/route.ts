import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get("partner_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!partnerId) {
        return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
    }

    // Calculate opening balance (before 'from' date)
    let openingBalance = 0;
    if (from) {
        const obSql = `
      SELECT SUM(l.debit - l.credit) as balance
      FROM accounting_move_lines l
      JOIN accounting_moves m ON l.move_id = m.id
      JOIN accounting_accounts a ON l.account_id = a.id
      WHERE l.partner_id = ? 
      AND m.state = 'posted'
      AND m.date < ?
      AND (a.type = 'asset_receivable' OR a.type = 'liability_payable')
    `;
        const obRes = await query<{ balance: number }>(obSql, [partnerId, from]);
        openingBalance = Number(obRes[0]?.balance) || 0;
    }

    // Get transactions
    let sql = `
    SELECT 
      m.date,
      m.ref,
      m.narration as move_narration,
      l.name as line_name,
      l.debit,
      l.credit,
      a.name as account_name,
      j.code as journal_code
    FROM accounting_move_lines l
    JOIN accounting_moves m ON l.move_id = m.id
    JOIN accounting_accounts a ON l.account_id = a.id
    JOIN accounting_journals j ON m.journal_id = j.id
    WHERE l.partner_id = ?
    AND m.state = 'posted'
    AND (a.type = 'asset_receivable' OR a.type = 'liability_payable')
  `;

    const params: (string | number | boolean | null)[] = [partnerId];

    if (from) {
        sql += " AND m.date >= ?";
        params.push(from);
    }
    if (to) {
        sql += " AND m.date <= ?";
        params.push(to);
    }

    sql += " ORDER BY m.date ASC, m.created_at ASC";

    try {
        const moves = await query<{ debit: number; credit: number }>(sql, params);

        // Calculate running balance
        let currentBalance = openingBalance;
        const report = moves.map((move) => {
            const debit = Number(move.debit);
            const credit = Number(move.credit);
            currentBalance += (debit - credit);
            return {
                ...move,
                running_balance: currentBalance
            };
        });

        return NextResponse.json({
            opening_balance: openingBalance,
            moves: report
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
