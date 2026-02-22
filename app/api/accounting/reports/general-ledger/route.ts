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
    const accountId = searchParams.get("account_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!accountId) {
        return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    // Calculate opening balance (before 'from' date)
    let openingBalance = 0;
    if (from) {
        const obSql = `
      SELECT SUM(l.debit - l.credit) as balance
      FROM accounting_move_lines l
      JOIN accounting_moves m ON l.move_id = m.id
      WHERE l.account_id = ? 
      AND m.state = 'posted'
      AND m.deleted_at IS NULL
      AND m.date < ?
    `;
        const obRes = await query(obSql, [accountId, from]);
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
      p.name as partner_name
    FROM accounting_move_lines l
    JOIN accounting_moves m ON l.move_id = m.id
    LEFT JOIN accounting_partners p ON l.partner_id = p.id
    WHERE l.account_id = ?
    AND m.state = 'posted'
    AND m.deleted_at IS NULL
  `;

    const params: any[] = [accountId];

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
        const moves = await query(sql, params);

        // Calculate running balance
        let currentBalance = openingBalance;
        const report = moves.map((move: any) => {
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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
