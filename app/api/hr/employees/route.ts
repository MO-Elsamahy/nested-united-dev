import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";

// GET: قائمة الموظفين
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const department = searchParams.get("department");
        const search = searchParams.get("search");

        let sql = `
      SELECT e.*, u.name as user_name, u.email as user_email
      FROM hr_employees e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (status) {
            sql += " AND e.status = ?";
            params.push(status);
        }
        if (department) {
            sql += " AND e.department = ?";
            params.push(department);
        }
        if (search) {
            sql += " AND (e.full_name LIKE ? OR e.employee_number LIKE ? OR e.national_id LIKE ?)";
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += " ORDER BY e.full_name ASC";

        const employees = await query(sql, params);
        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: إضافة موظف جديد
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const {
            user_id,
            employee_number,
            full_name,
            national_id,
            phone,
            email,
            department,
            job_title,
            hire_date,
            contract_type,
            basic_salary,
            housing_allowance,
            transport_allowance,
            other_allowances,
            annual_leave_balance,
            sick_leave_balance,
            bank_name,
            iban,
            exclude_from_payroll,
        } = body;

        if (!full_name) {
            return NextResponse.json({ error: "اسم الموظف مطلوب" }, { status: 400 });
        }

        // Check if employee number is unique
        if (employee_number) {
            const existing = await queryOne(
                "SELECT id FROM hr_employees WHERE employee_number = ?",
                [employee_number]
            );
            if (existing) {
                return NextResponse.json({ error: "رقم الموظف مستخدم مسبقاً" }, { status: 400 });
            }
        }

        const id = generateUUID();
        await execute(
            `INSERT INTO hr_employees (
        id, user_id, employee_number, full_name, national_id, phone, email,
        department, job_title, hire_date, contract_type,
        basic_salary, housing_allowance, transport_allowance, other_allowances,
        annual_leave_balance, sick_leave_balance, bank_name, iban, shift_id,
        exclude_from_payroll
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                user_id || null,
                employee_number || null,
                full_name,
                national_id || null,
                phone || null,
                email || null,
                department || null,
                job_title || null,
                hire_date || null,
                contract_type || "full_time",
                basic_salary || 0,
                housing_allowance || 0,
                transport_allowance || 0,
                other_allowances || 0,
                annual_leave_balance ?? 21,
                sick_leave_balance ?? 30,
                bank_name || null,
                iban || null,
                body.shift_id || null,
                exclude_from_payroll ? 1 : 0,
            ]
        );

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error: any) {
        console.error("Create employee error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
