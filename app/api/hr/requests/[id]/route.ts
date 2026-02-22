
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute, queryOne } from "@/lib/db";

// PUT: Approve / Reject Request
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {

    // Await params first (Next.js 15+ requirement if strictly following new types, but usually params is object)
    // Safe to await if it's a promise, or just use if not. In App Router params is often just passed.
    // But let's handle the promise just in case for future compat.
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { status, reviewer_notes } = body;

        if (!["approved", "rejected"].includes(status)) {
            return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
        }

        // 1. Update Request
        await execute(
            `UPDATE hr_requests 
       SET status = ?, 
           reviewed_by = ?, 
           reviewed_at = NOW(), 
           reviewer_notes = ? 
       WHERE id = ?`,
            [status, session.user.id, reviewer_notes, id]
        );

        // 2. If Approved & is Leave, deduct balance?
        // This is "Business Logic" - ideally we check request type.
        if (status === "approved") {
            const req = await queryOne<any>("SELECT * FROM hr_requests WHERE id = ?", [id]);
            if (req && (req.request_type === 'annual_leave' || req.request_type === 'sick_leave')) {
                // Deduct from balance
                const balanceField = req.request_type === 'annual_leave' ? 'annual_leave_balance' : 'sick_leave_balance';
                await execute(
                    `UPDATE hr_employees SET ${balanceField} = ${balanceField} - ? WHERE id = ?`,
                    [req.days_count, req.employee_id]
                );

                // Also - Auto-generate Attendance records as "Leave"?
                // That would be cool logic for Phase 3/4 integration.
                // For now, let's just deduct balance.
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
