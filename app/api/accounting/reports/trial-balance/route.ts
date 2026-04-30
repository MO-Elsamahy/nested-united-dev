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

    const params: (string | number | boolean | null)[] = [];

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
        const rows = await query<{ total_debit: number; total_credit: number; type: string }>(sql, params);

        // Process rows to calculate net balance
        const report = rows.map((row) => {
            const debit = Number(row.total_debit) || 0;
            const credit = Number(row.total_credit) || 0;
            const balance = debit - credit;

            return {
                ...row,
                total_debit: debit,
                total_credit: credit,
                balance
            };
        });

        return NextResponse.json(report);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
