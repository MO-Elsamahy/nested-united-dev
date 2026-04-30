import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";
import { Evaluation, Employee, EvaluationScore } from "@/lib/types/hr";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const evaluation = await queryOne<Evaluation>(
            `SELECT ev.*, e.full_name as employee_name, e.department, e.job_title, t.name as template_name, u.name as evaluator_name
             FROM hr_evaluations ev
             JOIN hr_employees e ON ev.employee_id = e.id
             JOIN hr_evaluation_templates t ON ev.template_id = t.id
             LEFT JOIN users u ON ev.evaluated_by = u.id
             WHERE ev.id = ?`,
            [resolvedParams.id]
        );

        if (!evaluation) {
            return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
        }

        // Must check if user is the employee themselves or HR
        // The middleware or scope check from earlier ensures basic auth, but we enforce it here
        const isEmployeePortal = request.headers.get("referer")?.includes("/employee");
        if (isEmployeePortal) {
            const currentEmployee = await queryOne<Employee>(
                "SELECT id FROM hr_employees WHERE user_id = ?",
                [session.user.id]
            );
            if (!currentEmployee || currentEmployee.id !== evaluation.employee_id) {
                return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
            }
        }

        const scores = await query<EvaluationScore & { criterion_name: string; max_score: number; weight: number }>(
            `SELECT s.*, c.criterion_name, c.max_score, c.weight 
             FROM hr_evaluation_scores s
             JOIN hr_evaluation_criteria c ON s.criterion_id = c.id
             WHERE s.evaluation_id = ?
             ORDER BY c.sort_order ASC`,
            [resolvedParams.id]
        );

        return NextResponse.json({ ...evaluation, scores });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
