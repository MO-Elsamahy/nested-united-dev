import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";
import { Employee } from "@/lib/types/hr";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        // 1. Get Employee ID
        const employee = await queryOne<Employee>(
            "SELECT id FROM hr_employees WHERE user_id = ? AND status = 'active'",
            [session.user.id]
        );

        if (!employee) {
            return NextResponse.json([]);
        }

        // 2. Fetch Unread Messages
        const messages = await query<{ id: string; title: string; type: string; created_at: string; is_read: number | boolean }>(
            `SELECT id, title as title, 'message' as type, created_at, is_read 
             FROM hr_employee_messages 
             WHERE employee_id = ? AND is_read = 0
             ORDER BY created_at DESC LIMIT 5`,
            [employee.id]
        );

        // 3. Fetch Recent Request Updates (approved/rejected in last 48h)
        const requestUpdates = await query<{ id: string; title: string; type: string; created_at: string; is_read: number | boolean }>(
            `SELECT id, 
                CONCAT('تم ', IF(status='approved', 'قبول', 'رفض'), ' طلبك: ', 
                CASE request_type 
                    WHEN 'annual_leave' THEN 'إجازة سنوية'
                    WHEN 'sick_leave' THEN 'إجازة مرضية'
                    WHEN 'unpaid_leave' THEN 'إجازة بدون راتب'
                    WHEN 'shift_swap' THEN 'تبديل شيفت'
                    WHEN 'overtime' THEN 'إضافي'
                    ELSE 'طلب'
                END) as title,
                'request' as type,
                reviewed_at as created_at,
                1 as is_read -- We use this as a flag for the UI
             FROM hr_requests 
             WHERE employee_id = ? AND status IN ('approved', 'rejected') 
             AND reviewed_at > NOW() - INTERVAL 2 DAY
             ORDER BY reviewed_at DESC LIMIT 5`,
            [employee.id]
        );

        // Combine and Sort
        const allNotifications = [...messages, ...requestUpdates]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10);

        return NextResponse.json(allNotifications);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
