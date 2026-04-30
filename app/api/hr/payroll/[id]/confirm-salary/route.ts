import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute, generateUUID } from "@/lib/db";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: payrollRunId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // 1. Get Employee ID for current user
        const employee = await queryOne<{ id: string }>("SELECT id FROM hr_employees WHERE user_id = ?", [session.user.id]);
        if (!employee) {
            return NextResponse.json({ error: "Employee record not found for this user" }, { status: 404 });
        }

        // 2. Check if payroll run exists and is approved
        const run = await queryOne<{ status: string }>("SELECT status FROM hr_payroll_runs WHERE id = ?", [payrollRunId]);
        if (!run) return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
        if (run.status !== 'approved' && run.status !== 'paid') {
            return NextResponse.json({ error: "Can only confirm salaries for approved payroll runs" }, { status: 400 });
        }

        // 3. Find the detail line
        const detail = await queryOne<{ id: string; salary_confirmed_at: string | null }>(
            "SELECT id, salary_confirmed_at FROM hr_payroll_details WHERE payroll_run_id = ? AND employee_id = ?",
            [payrollRunId, employee.id]
        );
        if (!detail) {
            return NextResponse.json({ error: "Salary record not found for this employee in this run" }, { status: 404 });
        }

        if (detail.salary_confirmed_at) {
            return NextResponse.json({ message: "Salary already confirmed" }, { status: 200 });
        }

        // 4. Update confirmation
        await execute(
            "UPDATE hr_payroll_details SET salary_confirmed_at = NOW(), salary_confirmed_by = ? WHERE id = ?",
            [session.user.id, detail.id]
        );

        // 5. Audit Log
        await execute(
            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
             VALUES (?, ?, 'confirm_salary', 'payroll_detail', ?, ?)`,
            [generateUUID(), session.user.id, detail.id, JSON.stringify({ payroll_run_id: payrollRunId })]
        );

        return NextResponse.json({ success: true, message: "تم تأكيد استلام الراتب بنجاح" });

    } catch (error: unknown) {
        console.error("Confirm salary error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
