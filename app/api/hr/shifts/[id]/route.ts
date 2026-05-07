import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { execute, queryOne } from "@/lib/db";
import { Shift } from "@/lib/types/hr";

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
        const shift = await queryOne<Shift>(
            "SELECT * FROM hr_shifts WHERE id = ?",
            [resolvedParams.id]
        );
        if (!shift) {
            return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
        }
        return NextResponse.json(shift);
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

    try {
        const body = await request.json();
        const { name, start_time, end_time, late_grace_minutes, days_off } = body;

        await execute(
            `UPDATE hr_shifts 
             SET name = ?, start_time = ?, end_time = ?, late_grace_minutes = ?, days_off = ? 
             WHERE id = ?`,
            [name, start_time, end_time, late_grace_minutes, days_off || "", resolvedParams.id]
        );

        return NextResponse.json({ success: true });
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

    try {
        await execute("DELETE FROM hr_shifts WHERE id = ?", [resolvedParams.id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
