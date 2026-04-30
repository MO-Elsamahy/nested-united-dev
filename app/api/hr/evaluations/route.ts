import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, executeTransaction, generateUUID, queryOne } from "@/lib/db";
import { Evaluation, Employee, EvaluationCriterion } from "@/lib/types/hr";

// GET: List all evaluations (filtered by month/year/employee)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get("employee_id");
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        const isEmployeePortal = searchParams.get("scope") === "self";

        let sql = `
            SELECT ev.*, e.full_name as employee_name, e.department, e.job_title, t.name as template_name, u.name as evaluator_name
            FROM hr_evaluations ev
            JOIN hr_employees e ON ev.employee_id = e.id
            JOIN hr_evaluation_templates t ON ev.template_id = t.id
            LEFT JOIN users u ON ev.evaluated_by = u.id
            WHERE 1=1
        `;
        const params: (string | number)[] = [];

        if (isEmployeePortal) {
            const currentEmployee = await queryOne<Employee>(
                "SELECT id FROM hr_employees WHERE user_id = ?",
                [session.user.id]
            );
            if (!currentEmployee) {
                return NextResponse.json({ error: "لا يوجد ملف موظف مرتبط" }, { status: 403 });
            }
            sql += " AND ev.employee_id = ?";
            params.push(currentEmployee.id);
        } else if (employeeId) {
            sql += " AND ev.employee_id = ?";
            params.push(employeeId);
        }

        if (month) {
            sql += " AND ev.eval_month = ?";
            params.push(parseInt(month));
        }

        if (year) {
            sql += " AND ev.eval_year = ?";
            params.push(parseInt(year));
        }

        sql += " ORDER BY ev.eval_year DESC, ev.eval_month DESC, ev.created_at DESC";

        const evaluations = await query<Evaluation>(sql, params);
        return NextResponse.json(evaluations);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Submit a new monthly evaluation
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { employee_id, template_id, eval_month, eval_year, notes, scores } = body as {
            employee_id: string;
            template_id: string;
            eval_month: number;
            eval_year: number;
            notes?: string;
            scores: { criterion_id: string; score: string; comment?: string }[];
        };

        // Verify if evaluation already exists for this month
        const existing = await queryOne<{ id: string }>(
            "SELECT id FROM hr_evaluations WHERE employee_id = ? AND eval_month = ? AND eval_year = ?",
            [employee_id, eval_month, eval_year]
        );

        if (existing) {
            return NextResponse.json({ error: "يوجد تقييم مسبق لهذا الموظف في هذا الشهر" }, { status: 400 });
        }

        const evaluationId = generateUUID();

        // Calculate totals
        let totalScore = 0;
        let maxPossibleScore = 0;
        
        // Fetch criteria weights and max scores to calculate accurate max_score and weighted sum
        const criteriaMap = new Map<string, EvaluationCriterion>();
        const criteriaData = await query<EvaluationCriterion>("SELECT id, max_score, weight FROM hr_evaluation_criteria WHERE template_id = ?", [template_id]);
        
        criteriaData.forEach(c => criteriaMap.set(c.id, c));

        for (const s of scores) {
            const cDef = criteriaMap.get(s.criterion_id);
            if (cDef) {
                // To keep it simple, we just sum up the raw scores and max scores 
                // Alternatively, we could compute weighted sums. We'll use simple sum of provided max_scores.
                totalScore += parseFloat(s.score);
                maxPossibleScore += cDef.max_score;
            }
        }

        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        await executeTransaction(async (connection) => {
            await connection.execute(
                `INSERT INTO hr_evaluations (id, employee_id, template_id, eval_month, eval_year, total_score, max_possible_score, percentage, notes, evaluated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [evaluationId, employee_id, template_id, eval_month, eval_year, totalScore, maxPossibleScore, percentage, notes || null, session.user.id]
            );

            for (const s of scores) {
                await connection.execute(
                    `INSERT INTO hr_evaluation_scores (id, evaluation_id, criterion_id, score, comment)
                     VALUES (?, ?, ?, ?, ?)`,
                    [generateUUID(), evaluationId, s.criterion_id, s.score, s.comment || null]
                );
            }
        });

        return NextResponse.json({ success: true, id: evaluationId });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
