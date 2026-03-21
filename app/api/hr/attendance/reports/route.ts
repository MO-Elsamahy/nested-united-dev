
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get("month") || (new Date().getMonth() + 1).toString();
        const year = searchParams.get("year") || new Date().getFullYear().toString();
        const department = searchParams.get("department");

        let sql = `
            SELECT 
                e.id,
                e.full_name,
                e.department,
                e.job_title,
                COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) as present_days,
                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
                COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
                COALESCE(SUM(a.late_minutes), 0) as total_late_minutes,
                COALESCE(SUM(a.overtime_minutes), 0) as total_overtime_minutes
            FROM hr_employees e
            LEFT JOIN users u ON e.user_id = u.id
            LEFT JOIN hr_attendance a 
                ON e.id = a.employee_id 
                AND MONTH(a.date) = ? 
                AND YEAR(a.date) = ?
            WHERE e.status = 'active'
            AND (u.role IS NULL OR u.role NOT IN ('super_admin', 'accountant'))
        `;

        const params: any[] = [month, year];

        if (department) {
            sql += " AND e.department = ?";
            params.push(department);
        }

        sql += " GROUP BY e.id, e.full_name, e.department, e.job_title ORDER BY e.full_name ASC";

        const report = await query(sql, params);
        return NextResponse.json(report);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
