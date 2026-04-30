import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

// GET: Generate Income Statement (Profit & Loss Statement)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const from_date = searchParams.get("from_date");
        const to_date = searchParams.get("to_date");

        if (!from_date || !to_date) {
            return NextResponse.json(
                { error: "Both from_date and to_date are required" },
                { status: 400 }
            );
        }

        // Query for income and expense accounts
        const results = await query<{
            id: string;
            code: string;
            name: string;
            type: string;
            amount: number;
        }>(`
            SELECT 
                a.id,
                a.code,
                a.name,
                a.type,
                SUM(CASE 
                    WHEN a.type = 'income' THEN ml.credit - ml.debit 
                    ELSE ml.debit - ml.credit 
                END) as amount
            FROM accounting_move_lines ml
            JOIN accounting_moves m ON ml.move_id = m.id
            JOIN accounting_accounts a ON ml.account_id = a.id
            WHERE m.state = 'posted' 
              AND m.deleted_at IS NULL
              AND m.date BETWEEN ? AND ?
              AND a.type IN ('income', 'expense', 'cost_of_sales')
            GROUP BY a.id, a.code, a.name, a.type
            HAVING amount != 0
            ORDER BY a.type DESC, a.code
        `, [from_date, to_date]);

        // Separate into revenue and expenses
        const revenue_accounts = results.filter((r) => r.type === 'income');
        const expense_accounts = results.filter((r) =>
            r.type === 'expense' || r.type === 'cost_of_sales'
        );

        const total_revenue = revenue_accounts.reduce((sum, acc) =>
            sum + Number(acc.amount), 0
        );
        const total_expenses = expense_accounts.reduce((sum, acc) =>
            sum + Number(acc.amount), 0
        );
        const net_income = total_revenue - total_expenses;

        return NextResponse.json({
            period: { from: from_date, to: to_date },
            revenue: {
                accounts: revenue_accounts,
                total: total_revenue
            },
            expenses: {
                accounts: expense_accounts,
                total: total_expenses
            },
            net_income: net_income
        });

    } catch (error: unknown) {
        console.error("Income statement error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
