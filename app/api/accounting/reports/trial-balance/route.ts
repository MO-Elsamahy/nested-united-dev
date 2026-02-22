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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let sql = `
    SELECT 
      a.id,
      a.code,
      a.name,
      a.type,
      SUM(l.debit) as total_debit,
      SUM(l.credit) as total_credit
    FROM accounting_accounts a
    LEFT JOIN accounting_move_lines l ON a.id = l.account_id
    LEFT JOIN accounting_moves m ON l.move_id = m.id
    WHERE m.state = 'posted'
  `;

    const params: any[] = [];

    if (from) {
        sql += " AND m.date >= ?";
        params.push(from);
    }
    if (to) {
        sql += " AND m.date <= ?";
        params.push(to);
    }

    sql += `
    GROUP BY a.id
    ORDER BY a.code ASC
  `;

    try {
        const rows = await query(sql, params);

        // Process rows to calculate net balance
        const report = rows.map((row: any) => {
            const debit = Number(row.total_debit) || 0;
            const credit = Number(row.total_credit) || 0;
            let balance = debit - credit;

            // Flip sign for naturally credit accounts (Liabilities, Income, Equity)
            if (['liability_payable', 'liability_current', 'liability_long_term', 'equity', 'income'].includes(row.type)) {
                // Usually displayed as Credit - Debit for these types, 
                // BUT in standard Trial Balance visuals, we often keep Dr/Cr columns.
                // Let's keep Dr/Cr columns and a Net Balance.
            }

            return {
                ...row,
                total_debit: debit,
                total_credit: credit,
                balance
            };
        });

        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
