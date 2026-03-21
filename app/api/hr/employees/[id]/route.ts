import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute } from "@/lib/db";

// GET: تفاصيل موظف واحد
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const employee = await queryOne(
            `SELECT e.*, u.name as user_name, u.email as user_email
       FROM hr_employees e
       LEFT JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
            [id]
        );

        if (!employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        return NextResponse.json(employee);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: تحديث بيانات موظف
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { id } = await params;
        const body = await request.json();

        // Check if employee exists
        const existing = await queryOne("SELECT id FROM hr_employees WHERE id = ?", [id]);
        if (!existing) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

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
            status,
        } = body;

        await execute(
            `UPDATE hr_employees SET
        user_id = ?,
        employee_number = ?,
        full_name = ?,
        national_id = ?,
        phone = ?,
        email = ?,
        department = ?,
        job_title = ?,
        hire_date = ?,
        contract_type = ?,
        basic_salary = ?,
        housing_allowance = ?,
        transport_allowance = ?,
        other_allowances = ?,
        annual_leave_balance = ?,
        sick_leave_balance = ?,
        bank_name = ?,
        iban = ?,
        status = ?,
        shift_id = ?
      WHERE id = ?`,
            [
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
                status || "active",
                body.shift_id || null,
                id,
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update employee error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: حذف موظف
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { id } = await params;

        // Soft delete by setting status to terminated
        await execute(
            "UPDATE hr_employees SET status = 'terminated' WHERE id = ?",
            [id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
