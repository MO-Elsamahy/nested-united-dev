import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, queryOne, generateUUID, executeTransaction } from "@/lib/db";

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
        const template = await queryOne<any>(
            "SELECT * FROM hr_evaluation_templates WHERE id = ?",
            [resolvedParams.id]
        );

        if (!template) {
            return NextResponse.json({ error: "القالب غير موجود" }, { status: 404 });
        }

        const criteria = await query(
            "SELECT * FROM hr_evaluation_criteria WHERE template_id = ? ORDER BY sort_order ASC",
            [resolvedParams.id]
        );

        return NextResponse.json({ ...template, criteria });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, description, criteria } = body;

        await executeTransaction(async (connection) => {
            // Update template details
            await connection.execute(
                "UPDATE hr_evaluation_templates SET name = ?, description = ? WHERE id = ?",
                [name, description || null, resolvedParams.id]
            );

            // Delete old criteria and insert new ones (simplest approach for full updates)
            await connection.execute(
                "DELETE FROM hr_evaluation_criteria WHERE template_id = ?",
                [resolvedParams.id]
            );

            if (criteria && Array.isArray(criteria)) {
                for (let i = 0; i < criteria.length; i++) {
                    const c = criteria[i];
                    await connection.execute(
                        `INSERT INTO hr_evaluation_criteria (id, template_id, criterion_name, max_score, weight, sort_order)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [generateUUID(), resolvedParams.id, c.criterion_name, c.max_score || 10, c.weight || 1.0, i]
                    );
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        // criteria cascade delete from DB design
        await execute(
            "DELETE FROM hr_evaluation_templates WHERE id = ?",
            [resolvedParams.id]
        );
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
