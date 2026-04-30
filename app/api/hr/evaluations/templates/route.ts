import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, generateUUID, executeTransaction } from "@/lib/db";
import { EvaluationTemplate } from "@/lib/types/hr";

// GET: List all evaluation templates
export async function GET(_request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const templates = await query<EvaluationTemplate>(
            "SELECT * FROM hr_evaluation_templates ORDER BY created_at DESC"
        );
        return NextResponse.json(templates);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new template with initial criteria
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, description, criteria } = body;

        if (!name || !criteria || !Array.isArray(criteria) || criteria.length === 0) {
            return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
        }

        const templateId = generateUUID();

        // Use transaction to ensure both template and criteria are saved
        await executeTransaction(async (connection) => {
            await connection.execute(
                `INSERT INTO hr_evaluation_templates (id, name, description, created_by)
                 VALUES (?, ?, ?, ?)`,
                [templateId, name, description || null, session.user.id]
            );

            for (let i = 0; i < criteria.length; i++) {
                const c = criteria[i];
                await connection.execute(
                    `INSERT INTO hr_evaluation_criteria (id, template_id, criterion_name, max_score, weight, sort_order)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [generateUUID(), templateId, c.criterion_name, c.max_score || 10, c.weight || 1.0, i]
                );
            }
        });

        return NextResponse.json({ success: true, id: templateId });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
