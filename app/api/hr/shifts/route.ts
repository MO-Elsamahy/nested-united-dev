import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, generateUUID } from "@/lib/db";
import { Shift } from "@/lib/types/hr";

// GET: List all shifts
export async function GET(_request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const shifts = await query<Shift>("SELECT * FROM hr_shifts ORDER BY created_at DESC");
        return NextResponse.json(shifts);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new shift
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, start_time, end_time, late_grace_minutes, days_off } = body;

        if (!name || !start_time || !end_time) {
            return NextResponse.json({ error: "البيانات ناقصة" }, { status: 400 });
        }

        const id = generateUUID();
        await execute(
            `INSERT INTO hr_shifts (id, name, start_time, end_time, late_grace_minutes, days_off, is_active)
       VALUES (?, ?, ?, ?, ?, ?, true)`,
            [id, name, start_time, end_time, late_grace_minutes || 15, days_off || ""]
        );

        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
