import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

// GET: Generate Balance Sheet
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const as_of_date = searchParams.get("as_of_date") || new Date().toISOString().split('T')[0];

        // Query for balance sheet accounts (assets, liabilities, equity)
        const results = await query<any>(`
            SELECT 
                a.id,
                a.code,
                a.name,
                a.type,
                CASE 
                    WHEN a.type LIKE 'asset_%' THEN SUM(ml.debit - ml.credit)
                    WHEN a.type LIKE 'liability_%' THEN SUM(ml.credit - ml.debit)
                    WHEN a.type = 'equity' THEN SUM(ml.credit - ml.debit)
                    ELSE 0
                END as balance
            FROM accounting_move_lines ml
            JOIN accounting_moves m ON ml.move_id = m.id
            JOIN accounting_accounts a ON ml.account_id = a.id
            WHERE m.state = 'posted' 
              AND m.deleted_at IS NULL
              AND m.date <= ?
              AND a.type IN (
                  'asset_receivable', 'asset_bank', 'asset_current', 'asset_fixed',
                  'liability_payable', 'liability_current', 'liability_long_term', 
                  'equity'
              )
            GROUP BY a.id, a.code, a.name, a.type
            HAVING balance != 0
            ORDER BY a.type, a.code
        `, [as_of_date]);

        // Separate by category
        const assets = results.filter((r: any) => r.type.startsWith('asset_'));
        const liabilities = results.filter((r: any) => r.type.startsWith('liability_'));
        const equity = results.filter((r: any) => r.type === 'equity');

        const total_assets = assets.reduce((sum: number, acc: any) =>
            sum + Number(acc.balance), 0
        );
        const total_liabilities = liabilities.reduce((sum: number, acc: any) =>
            sum + Number(acc.balance), 0
        );
        const total_equity = equity.reduce((sum: number, acc: any) =>
            sum + Number(acc.balance), 0
        );

        // Calculate retained earnings from income statement
        // (This is a simplified version - in practice you might want to query separately)
        const retained_earnings_result = await query<any>(`
            SELECT 
                SUM(CASE 
                    WHEN a.type = 'income' THEN ml.credit - ml.debit 
                    WHEN a.type = 'expense' OR a.type = 'cost_of_sales' THEN ml.debit - ml.credit 
                END) as net_income
            FROM accounting_move_lines ml
            JOIN accounting_moves m ON ml.move_id = m.id
            JOIN accounting_accounts a ON ml.account_id = a.id
            WHERE m.state = 'posted' 
              AND m.deleted_at IS NULL
              AND m.date <= ?
              AND a.type IN ('income', 'expense', 'cost_of_sales')
        `, [as_of_date]);

        const retained_earnings = Number(retained_earnings_result[0]?.net_income || 0);
        const total_equity_with_earnings = total_equity + retained_earnings;

        // Verify balance sheet equation
        const is_balanced = Math.abs(total_assets - (total_liabilities + total_equity_with_earnings)) < 0.01;

        return NextResponse.json({
            as_of_date: as_of_date,
            assets: {
                accounts: assets,
                total: total_assets
            },
            liabilities: {
                accounts: liabilities,
                total: total_liabilities
            },
            equity: {
                accounts: equity,
                retained_earnings: retained_earnings,
                total: total_equity_with_earnings
            },
            balance_check: {
                is_balanced: is_balanced,
                difference: total_assets - (total_liabilities + total_equity_with_earnings)
            }
        });

    } catch (error: any) {
        console.error("Balance sheet error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
