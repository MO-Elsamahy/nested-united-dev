import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute } from "@/lib/db";
import { Employee } from "@/lib/types/hr";

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
        const employee = await queryOne<Employee>(
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
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
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
        const existing = await queryOne<{ id: string }>("SELECT id FROM hr_employees WHERE id = ?", [id]);
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
            exclude_from_payroll,
            salary_currency,
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
        shift_id = ?,
        exclude_from_payroll = ?,
        salary_currency = ?
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
                exclude_from_payroll ? 1 : 0,
                salary_currency || "SAR",
                id,
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Update employee error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: إنهاء خدمات (افتراضي) أو حذف نهائي (?permanent=1) لمسؤول أعلى فقط عند عدم وجود سجلات مرتبطة
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
        const url = new URL(request.url);
        const permanent =
            url.searchParams.get("permanent") === "1" || url.searchParams.get("permanent") === "true";
        const role = session.user.role;

        const exists = await queryOne<{ id: string }>("SELECT id FROM hr_employees WHERE id = ?", [id]);
        if (!exists) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        if (permanent) {
            if (role !== "super_admin") {
                return NextResponse.json(
                    { error: "الحذف النهائي متاح لمسؤول النظام (super_admin) فقط." },
                    { status: 403 }
                );
            }

            const blocks: { key: string; label: string; count: number }[] = [];
            const checks: { sql: string; label: string; key: string }[] = [
                {
                    key: "payroll",
                    label: "سطور مسيرات رواتب",
                    sql: "SELECT COUNT(*) AS c FROM hr_payroll_details WHERE employee_id = ?",
                },
                {
                    key: "attendance",
                    label: "سجلات حضور وانصراف",
                    sql: "SELECT COUNT(*) AS c FROM hr_attendance WHERE employee_id = ?",
                },
                {
                    key: "requests",
                    label: "طلبات الموارد البشرية",
                    sql: "SELECT COUNT(*) AS c FROM hr_requests WHERE employee_id = ?",
                },
                {
                    key: "evaluations",
                    label: "تقييمات الأداء",
                    sql: "SELECT COUNT(*) AS c FROM hr_evaluations WHERE employee_id = ?",
                },
                {
                    key: "eval_config",
                    label: "إعدادات التقييم",
                    sql: "SELECT COUNT(*) AS c FROM hr_employee_eval_config WHERE employee_id = ?",
                },
                {
                    key: "messages",
                    label: "رسائل HR للموظف",
                    sql: "SELECT COUNT(*) AS c FROM hr_employee_messages WHERE employee_id = ?",
                },
            ];

            for (const { sql, label, key } of checks) {
                try {
                    const row = await queryOne<{ c: number }>(sql, [id]);
                    const c = Number(row?.c ?? 0);
                    if (c > 0) blocks.push({ key, label, count: c });
                } catch {
                    // جدول غير موجود في بعض النسخ — نتجاهل
                }
            }

            if (blocks.length > 0) {
                return NextResponse.json(
                    {
                        error:
                            "لا يمكن الحذف النهائي لوجود بيانات مرتبطة بهذا الموظف. احذف أو انقل السجلات أولاً، أو استخدم «إنهاء الخدمة» فقط.",
                        blocks,
                    },
                    { status: 409 }
                );
            }

            await execute("DELETE FROM hr_employees WHERE id = ?", [id]);
            return NextResponse.json({ success: true, mode: "deleted" });
        }

        await execute("UPDATE hr_employees SET status = 'terminated' WHERE id = ?", [id]);
        return NextResponse.json({ success: true, mode: "terminated" });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
