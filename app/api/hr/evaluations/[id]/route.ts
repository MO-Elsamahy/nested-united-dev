import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query, queryOne, executeTransaction, generateUUID } from "@/lib/db";
import { Evaluation, Employee, EvaluationScore, EvaluationCriterion } from "@/lib/types/hr";
import { checkUserPermission } from "@/lib/permissions";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const user = await getCurrentUser();
    if (!user) {
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
                [user.id]
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

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const hasPermission = await checkUserPermission(user.id, "/hr", "edit");
    if (!hasPermission) {
        return NextResponse.json({ error: "غير مصرح لك بحذف التقييمات" }, { status: 403 });
    }

    try {
        await executeTransaction(async (connection) => {
            // Delete child scores first
            await connection.execute(
                "DELETE FROM hr_evaluation_scores WHERE evaluation_id = ?",
                [resolvedParams.id]
            );
            // Delete parent evaluation
            await connection.execute(
                "DELETE FROM hr_evaluations WHERE id = ?",
                [resolvedParams.id]
            );
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const hasPermission = await checkUserPermission(user.id, "/hr", "edit");
    if (!hasPermission) {
        return NextResponse.json({ error: "غير مصرح لك بتعديل التقييمات" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { eval_month, eval_year, notes, scores } = body as {
            eval_month: number;
            eval_year: number;
            notes?: string;
            scores: { criterion_id: string; score: string; comment?: string }[];
        };

        // Fetch the existing evaluation record to verify and get template_id
        const existing = await queryOne<Evaluation>(
            "SELECT id, template_id FROM hr_evaluations WHERE id = ?",
            [resolvedParams.id]
        );

        if (!existing) {
            return NextResponse.json({ error: "التقييم غير موجود" }, { status: 404 });
        }

        // Calculate totals
        let totalScore = 0;
        let maxPossibleScore = 0;

        // Fetch criteria for the template
        const criteriaMap = new Map<string, EvaluationCriterion>();
        const criteriaData = await query<EvaluationCriterion>(
            "SELECT id, max_score, weight FROM hr_evaluation_criteria WHERE template_id = ?",
            [existing.template_id]
        );

        criteriaData.forEach(c => criteriaMap.set(c.id, c));

        for (const s of scores) {
            const cDef = criteriaMap.get(s.criterion_id);
            if (cDef) {
                totalScore += parseFloat(s.score);
                maxPossibleScore += parseFloat(cDef.max_score as any);
            }
        }

        const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

        await executeTransaction(async (connection) => {
            // Update parent evaluation
            await connection.execute(
                `UPDATE hr_evaluations 
                 SET eval_month = ?, eval_year = ?, total_score = ?, max_possible_score = ?, percentage = ?, notes = ?
                 WHERE id = ?`,
                [eval_month, eval_year, totalScore, maxPossibleScore, percentage, notes || null, resolvedParams.id]
            );

            // Delete old child scores
            await connection.execute(
                "DELETE FROM hr_evaluation_scores WHERE evaluation_id = ?",
                [resolvedParams.id]
            );

            // Insert new child scores
            for (const s of scores) {
                await connection.execute(
                    `INSERT INTO hr_evaluation_scores (id, evaluation_id, criterion_id, score, comment)
                     VALUES (?, ?, ?, ?, ?)`,
                    [generateUUID(), resolvedParams.id, s.criterion_id, s.score, s.comment || null]
                );
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
