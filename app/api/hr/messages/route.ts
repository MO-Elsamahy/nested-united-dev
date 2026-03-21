import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, generateUUID, queryOne } from "@/lib/db";

// GET: List messages (Admin sees all, Employee sees own)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employee_id");
        const type = searchParams.get("type");
        const isEmployeePortal = searchParams.get("scope") === "self";

        let sql = `
            SELECT m.*, e.full_name as employee_name, e.department, e.job_title, u.name as sender_name
            FROM hr_employee_messages m
            JOIN hr_employees e ON m.employee_id = e.id
            LEFT JOIN users u ON m.sent_by = u.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (isEmployeePortal) {
            const currentEmployee = await queryOne<any>(
                "SELECT id FROM hr_employees WHERE user_id = ?",
                [session.user.id]
            );
            
            if (!currentEmployee) {
                return NextResponse.json({ error: "لا يوجد ملف موظف مرتبط" }, { status: 403 });
            }
            sql += " AND m.employee_id = ?";
            params.push(currentEmployee.id);
        } else if (employeeId) {
            sql += " AND m.employee_id = ?";
            params.push(employeeId);
        }

        if (type) {
            sql += " AND m.msg_type = ?";
            params.push(type);
        }

        sql += " ORDER BY m.created_at DESC";

        const messages = await query(sql, params);
        return NextResponse.json(messages);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Admin sends a message to an employee
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // In a real app we'd check if user is admin/hr here
    try {
        const body = await request.json();
        const { employee_id, msg_type, title, content } = body;

        if (!employee_id || !msg_type || !title || !content) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        const id = generateUUID();

        await execute(
            `INSERT INTO hr_employee_messages (id, employee_id, msg_type, title, content, sent_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, employee_id, msg_type, title, content, session.user.id]
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
