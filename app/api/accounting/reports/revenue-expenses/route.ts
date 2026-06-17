import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/accounting/reports/revenue-expenses
 * تقرير تفصيلي للإيرادات والتكاليف
 *
 * Query params:
 *   from_date  - تاريخ البداية (YYYY-MM-DD)
 *   to_date    - تاريخ النهاية (YYYY-MM-DD)
 *   group_by   - 'month' (افتراضي) أو 'cost_center'
 */
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const from_date = searchParams.get("from_date");
        const to_date = searchParams.get("to_date");
        const group_by = searchParams.get("group_by") || "month";

        if (!from_date || !to_date) {
            return NextResponse.json(
                { error: "from_date و to_date مطلوبان" },
                { status: 400 }
            );
        }

        if (group_by === "cost_center") {
            // ── تجميع بمراكز التكلفة ──
            const rows = await query<{
                cost_center_id: string | null;
                cost_center_code: string | null;
                cost_center_name: string | null;
                account_type: string;
                amount: number;
            }>(`
                SELECT
                    ml.cost_center_id,
                    cc.code AS cost_center_code,
                    cc.name AS cost_center_name,
                    a.type AS account_type,
                    SUM(CASE
                        WHEN a.type = 'income' THEN ml.credit - ml.debit
                        ELSE ml.debit - ml.credit
                    END) AS amount
                FROM accounting_move_lines ml
                JOIN accounting_moves m ON ml.move_id = m.id
                JOIN accounting_accounts a ON ml.account_id = a.id
                LEFT JOIN accounting_cost_centers cc ON ml.cost_center_id = cc.id
                WHERE m.state = 'posted'
                  AND m.deleted_at IS NULL
                  AND m.date BETWEEN ? AND ?
                  AND a.type IN ('income', 'expense', 'cost_of_sales')
                GROUP BY ml.cost_center_id, cc.code, cc.name, a.type
                HAVING amount != 0
                ORDER BY cc.code ASC, a.type DESC
            `, [from_date, to_date]);

            // تنظيم البيانات حسب مركز التكلفة
            const costCenterMap: Record<string, {
                id: string | null;
                code: string | null;
                name: string | null;
                revenue: number;
                expenses: number;
                net: number;
            }> = {};

            for (const row of rows) {
                const key = row.cost_center_id || "__none__";
                if (!costCenterMap[key]) {
                    costCenterMap[key] = {
                        id: row.cost_center_id,
                        code: row.cost_center_code,
                        name: row.cost_center_name || "بدون مركز تكلفة",
                        revenue: 0,
                        expenses: 0,
                        net: 0,
                    };
                }
                const amount = Number(row.amount);
                if (row.account_type === "income") {
                    costCenterMap[key].revenue += amount;
                } else {
                    costCenterMap[key].expenses += amount;
                }
                costCenterMap[key].net = costCenterMap[key].revenue - costCenterMap[key].expenses;
            }

            const cost_centers = Object.values(costCenterMap);
            const totals = cost_centers.reduce(
                (acc, cc) => ({
                    revenue: acc.revenue + cc.revenue,
                    expenses: acc.expenses + cc.expenses,
                    net: acc.net + cc.net,
                }),
                { revenue: 0, expenses: 0, net: 0 }
            );

            return NextResponse.json({
                group_by: "cost_center",
                period: { from: from_date, to: to_date },
                cost_centers,
                totals,
            });

        } else {
            // ── تجميع بالشهر (افتراضي) ──
            const rows = await query<{
                year: number;
                month: number;
                account_type: string;
                amount: number;
            }>(`
                SELECT
                    YEAR(m.date) AS year,
                    MONTH(m.date) AS month,
                    a.type AS account_type,
                    SUM(CASE
                        WHEN a.type = 'income' THEN ml.credit - ml.debit
                        ELSE ml.debit - ml.credit
                    END) AS amount
                FROM accounting_move_lines ml
                JOIN accounting_moves m ON ml.move_id = m.id
                JOIN accounting_accounts a ON ml.account_id = a.id
                WHERE m.state = 'posted'
                  AND m.deleted_at IS NULL
                  AND m.date BETWEEN ? AND ?
                  AND a.type IN ('income', 'expense', 'cost_of_sales')
                GROUP BY YEAR(m.date), MONTH(m.date), a.type
                HAVING amount != 0
                ORDER BY year ASC, month ASC, a.type DESC
            `, [from_date, to_date]);

            // تنظيم البيانات شهرياً
            const monthMap: Record<string, {
                year: number;
                month: number;
                label: string;
                revenue: number;
                expenses: number;
                net: number;
            }> = {};

            const arabicMonths = [
                "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
            ];

            for (const row of rows) {
                const key = `${row.year}-${String(row.month).padStart(2, "0")}`;
                if (!monthMap[key]) {
                    monthMap[key] = {
                        year: row.year,
                        month: row.month,
                        label: `${arabicMonths[row.month - 1]} ${row.year}`,
                        revenue: 0,
                        expenses: 0,
                        net: 0,
                    };
                }
                const amount = Number(row.amount);
                if (row.account_type === "income") {
                    monthMap[key].revenue += amount;
                } else {
                    monthMap[key].expenses += amount;
                }
                monthMap[key].net = monthMap[key].revenue - monthMap[key].expenses;
            }

            const months = Object.values(monthMap);
            const totals = months.reduce(
                (acc, m) => ({
                    revenue: acc.revenue + m.revenue,
                    expenses: acc.expenses + m.expenses,
                    net: acc.net + m.net,
                }),
                { revenue: 0, expenses: 0, net: 0 }
            );

            return NextResponse.json({
                group_by: "month",
                period: { from: from_date, to: to_date },
                months,
                totals,
            });
        }

    } catch (error: unknown) {
        console.error("Revenue-expenses report error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
