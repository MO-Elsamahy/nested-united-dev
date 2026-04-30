
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute, queryOne } from "@/lib/db";
import { HRRequest } from "@/lib/types/hr";

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
            const req = await queryOne<HRRequest & { request_type: string }>("SELECT * FROM hr_requests WHERE id = ?", [id]);
            if (req) {
                // Deduct from balance
                // Handle various leave types
                const dbReqType = req.request_type;
                const balanceField = dbReqType === 'annual_leave' ? 'annual_leave_balance' : 'sick_leave_balance';
                if (dbReqType === 'annual_leave' || dbReqType === 'sick_leave') {
                    await execute(
                        `UPDATE hr_employees SET ${balanceField} = ${balanceField} - ? WHERE id = ?`,
                        [req.days_count, req.employee_id]
                    );
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Permanent delete for admin cleanup
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Only HR Managers or Admins can delete
    if (!session?.user || !['super_admin', 'admin', 'hr_manager'].includes(session.user.role)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        await execute("DELETE FROM hr_requests WHERE id = ?", [id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
