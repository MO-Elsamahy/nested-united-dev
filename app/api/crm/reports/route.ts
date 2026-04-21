import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // all, week, month, quarter

    // Build date filter
    let dateFilter = "";
    let actDateFilter = "";
    if (period === "week") {
        dateFilter = "AND d.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        actDateFilter = "AND a.performed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    } else if (period === "month") {
        dateFilter = "AND d.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        actDateFilter = "AND a.performed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
    } else if (period === "quarter") {
        dateFilter = "AND d.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
        actDateFilter = "AND a.performed_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
    }

    try {
        // ── KPIs ──
        const totalCustomers = await queryOne<any>(
            "SELECT COUNT(*) as count, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM customers"
        );

        const openDeals = await queryOne<any>(
            `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM crm_deals d WHERE status = 'open' ${dateFilter}`
        );

        const avgDealValue = await queryOne<any>(
            `SELECT COALESCE(AVG(value), 0) as avg_val FROM crm_deals d WHERE value > 0 ${dateFilter}`
        );

        const wonDeals = await queryOne<any>(
            `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM crm_deals d WHERE stage IN ('won','paid','completed') ${dateFilter}`
        );

        const lostDeals = await queryOne<any>(
            `SELECT COUNT(*) as count FROM crm_deals d WHERE stage = 'lost' ${dateFilter}`
        );

        const totalDeals = await queryOne<any>(
            `SELECT COUNT(*) as count FROM crm_deals d WHERE 1=1 ${dateFilter}`
        );

        const closedDeals = await queryOne<any>(
            `SELECT COUNT(*) as count FROM crm_deals d WHERE status = 'closed' ${dateFilter}`
        );

        // ── Pipeline ──
        const dealsByStage = await query<any>(
            `SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value 
             FROM crm_deals d WHERE status = 'open' ${dateFilter}
             GROUP BY stage 
             ORDER BY FIELD(stage, 'new','contacting','qualified','proposal','negotiation','won','paid','completed','lost')`
        );

        // ── Stage Performance / Funnel (replaces flawed bottleneck logic) ──
        const stagePerformance = await query<any>(
            `SELECT 
                d.stage as current_stage,
                COUNT(d.id) as active_deals,
                SUM(CASE WHEN d.status = 'closed' AND d.stage = 'lost' THEN 1 ELSE 0 END) as lost_deals
             FROM crm_deals d
             WHERE 1=1 ${dateFilter}
             GROUP BY d.stage`
        );
        
        const historicalStages = await query<any>(
            `SELECT 
                SUBSTRING_INDEX(SUBSTRING_INDEX(a.description, 'إلى ', -1), ' ', 1) as to_stage,
                COUNT(DISTINCT a.deal_id) as deals_reached
             FROM crm_activities a
             WHERE a.type = 'status_change' AND a.description LIKE '%إلى %' ${actDateFilter}
             GROUP BY to_stage`
        );

        // ── Employee Performance (tracks actual distinct deals worked on, solves duplicate sum bloat / shifts) ──
        const employeePerf = await query<any>(
            `SELECT 
                u.name,
                u.id as user_id,
                (SELECT COUNT(*) FROM crm_activities a2 WHERE a2.performed_by = u.id ${actDateFilter.replace(/a\./g, 'a2.')}) as activity_count,
                COUNT(ud.deal_id) as deals_worked_on,
                SUM(CASE WHEN ud.stage IN ('won','paid','completed') THEN 1 ELSE 0 END) as won_count,
                SUM(CASE WHEN ud.stage = 'lost' THEN 1 ELSE 0 END) as lost_count,
                COALESCE(SUM(ud.value), 0) as deal_value,
                COALESCE(SUM(CASE WHEN ud.stage IN ('won','paid','completed') THEN ud.value ELSE 0 END), 0) as won_value
             FROM users u
             INNER JOIN (
                 SELECT DISTINCT a.performed_by as user_id, d.id as deal_id, d.stage, d.value
                 FROM crm_activities a
                 INNER JOIN crm_deals d ON a.deal_id = d.id
                 WHERE 1=1 ${actDateFilter}
             ) ud ON u.id = ud.user_id
             WHERE u.is_active = 1
             GROUP BY u.id, u.name
             HAVING activity_count > 0
             ORDER BY won_count DESC, activity_count DESC`
        );

        // ── Top Customers ──
        const topCustomers = await query<any>(
            `SELECT c.full_name as customer_name, COUNT(d.id) as deal_count, COALESCE(SUM(d.value), 0) as total_value
             FROM customers c 
             LEFT JOIN crm_deals d ON c.id = d.customer_id ${dateFilter}
             GROUP BY c.id, c.full_name HAVING deal_count > 0
             ORDER BY total_value DESC, deal_count DESC LIMIT 5`
        );

        // ── Recent Deals ──
        const recentDeals = await query<any>(
            `SELECT d.id, d.title, c.full_name as customer_name, d.stage, d.value, d.created_at
             FROM crm_deals d LEFT JOIN customers c ON d.customer_id = c.id
             WHERE 1=1 ${dateFilter}
             ORDER BY d.created_at DESC LIMIT 6`
        );

        // ── Monthly Activity ──
        const monthlyActivity = await query<any>(
            `SELECT DATE_FORMAT(performed_at, '%Y-%m') as month, COUNT(*) as count
             FROM crm_activities WHERE performed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month`
        );

        const monthlyDeals = await query<any>(
            `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count
             FROM crm_deals WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
             GROUP BY month ORDER BY month`
        );

        const weeklyActivity = await queryOne<any>(
            "SELECT COUNT(*) as count FROM crm_activities WHERE performed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
        );

        return NextResponse.json({
            totalCustomers, openDeals, avgDealValue, wonDeals, lostDeals,
            totalDeals, closedDeals, dealsByStage, stagePerformance, historicalStages,
            employeePerf, topCustomers, recentDeals,
            monthlyActivity, monthlyDeals, weeklyActivity,
        });
    } catch (error: any) {
        console.error("Reports API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
