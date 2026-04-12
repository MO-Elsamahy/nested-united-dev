import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute, queryOne } from "@/lib/db";

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
        const shift = await queryOne(
            "SELECT * FROM hr_shifts WHERE id = ?",
            [resolvedParams.id]
        );
        if (!shift) {
            return NextResponse.json({ error: "الوردية غير موجودة" }, { status: 404 });
        }
        return NextResponse.json(shift);
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
        const { name, start_time, end_time, late_grace_minutes, days_off } = body;

        await execute(
            `UPDATE hr_shifts 
             SET name = ?, start_time = ?, end_time = ?, late_grace_minutes = ?, days_off = ? 
             WHERE id = ?`,
            [name, start_time, end_time, late_grace_minutes, days_off || "", resolvedParams.id]
        );

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
        await execute("DELETE FROM hr_shifts WHERE id = ?", [resolvedParams.id]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
