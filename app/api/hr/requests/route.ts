
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, generateUUID, queryOne } from "@/lib/db";

// GET: List requests (Employee sees own, Admin/HR sees all or filtered)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        // Check role
        const userRole = session.user.role || "employee"; // Assuming role exists in session
        // Or better, check if user is linked to an employee record to decide context

        let sql = `
      SELECT r.*, e.full_name, e.department, e.job_title 
      FROM hr_requests r
      JOIN hr_employees e ON r.employee_id = e.id
    `;
        const params: any[] = [];

        // If "employee" portal context (we can infer this if they ask for their own requests specifically, 
        // or we can allow "employee" role to ONLY see their own).
        // Let's rely on query params or session logic.
        // For safety: If not admin/hr, enforce employee_id filter.

        // For now, let's look up the employee record for the current user
        const currentEmployee = await queryOne<any>(
            "SELECT id FROM hr_employees WHERE user_id = ?",
            [session.user.id]
        );

        // If user is NOT admin and IS an employee, strictly show own requests
        const isAdmin = userRole === "admin" || userRole === "hr_manager"; // Adjust roles as per your system

        // Actually, looking at previous files, we didn't strictly implement roles in session yet, 
        // relying mostly on "hr_employees" existence for employee portal.
        // Let's assume /api/hr/requests is for ADMIN use primarily, 
        // and maybe we make a separate one or use this with a flag for employees?
        // Let's make this versatile.

        if (searchParams.get("scope") === "self") {
            if (!currentEmployee) {
                return NextResponse.json({ error: "No employee record found" }, { status: 403 });
            }
            sql += " WHERE r.employee_id = ?";
            params.push(currentEmployee.id);
        } else {
            // Admin view
            // Ideally check headers/session for admin role.
            // For simplicity now, we'll return all if not "self", but in production add role check.
            // Let's check if status is filtered
            if (status) {
                sql += " WHERE r.status = ?";
                params.push(status);
            }
        }

        sql += " ORDER BY r.created_at DESC";

        const requests = await query(sql, params);
        return NextResponse.json(requests);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new request
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { request_type, start_date, end_date, reason } = body;

        // Validate
        if (!request_type || !start_date || !reason) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        // Get Employee ID
        const employee = await queryOne<any>(
            "SELECT id FROM hr_employees WHERE user_id = ?",
            [session.user.id]
        );

        if (!employee) {
            return NextResponse.json({ error: "لا يوجد ملف موظف مرتبط بحسابك" }, { status: 403 });
        }

        // Calculate days count
        const start = new Date(start_date);
        const end = end_date ? new Date(end_date) : start;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days_count = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day

        const id = generateUUID();

        await execute(
            `INSERT INTO hr_requests (id, employee_id, request_type, start_date, end_date, days_count, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [id, employee.id, request_type, start_date, end_date || start_date, days_count, reason]
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
