import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute, generateUUID, queryOne } from "@/lib/db";
import { EmployeeEvalConfig } from "@/lib/types/hr";

// GET: Get template assigned to employee
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employee_id");

        if (!employeeId) {
            return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 });
        }

        const config = await queryOne<EmployeeEvalConfig>(
            `SELECT c.*, t.name as template_name
             FROM hr_employee_eval_config c
             JOIN hr_evaluation_templates t ON c.template_id = t.id
             WHERE c.employee_id = ?`,
            [employeeId]
        );

        return NextResponse.json(config || { error: "لم يتم تعيين قالب لهذا الموظف" });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Assign template to employee
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { employee_id, template_id } = body;

        if (!employee_id || !template_id) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        // Upsert logic: if exists update, else insert
        const existing = await queryOne("SELECT id FROM hr_employee_eval_config WHERE employee_id = ?", [employee_id]);

        if (existing) {
            await execute(
                "UPDATE hr_employee_eval_config SET template_id = ? WHERE employee_id = ?",
                [template_id, employee_id]
            );
        } else {
            await execute(
                "INSERT INTO hr_employee_eval_config (id, employee_id, template_id) VALUES (?, ?, ?)",
                [generateUUID(), employee_id, template_id]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
