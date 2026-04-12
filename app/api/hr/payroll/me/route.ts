import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Get Employee ID for current user
        const employee = await queryOne<any>("SELECT id FROM hr_employees WHERE user_id = ?", [session.user.id]);
        if (!employee) {
            return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
        }

        // 2. Fetch approved/paid payroll details for this employee
        const payslips = await query(`
            SELECT 
                d.*,
                r.period_month,
                r.period_year,
                r.status as run_status,
                r.approved_at,
                u.name as confirmed_by_name
            FROM hr_payroll_details d
            JOIN hr_payroll_runs r ON d.payroll_run_id = r.id
            LEFT JOIN users u ON d.salary_confirmed_by = u.id
            WHERE d.employee_id = ? AND r.status IN ('approved', 'paid')
            ORDER BY r.period_year DESC, r.period_month DESC
        `, [employee.id]);

        return NextResponse.json(payslips);

    } catch (error: any) {
        console.error("Fetch my payslips error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
