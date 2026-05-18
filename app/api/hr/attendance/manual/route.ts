import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { queryOne, execute, generateUUID } from "@/lib/db";

const ADMIN_ROLES = ["super_admin", "admin", "hr_manager", "accountant"];

/**
 * PUT /api/hr/attendance/manual
 * Manually set or update an attendance record for any employee on any date.
 * Admins only.
 */
export async function PUT(request: Request) {
    const user = await getCurrentUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { employee_id, date, check_in, check_out, status, notes } = body;

        if (!employee_id || !date) {
            return NextResponse.json({ error: "معرف الموظف والتاريخ مطلوبان" }, { status: 400 });
        }

        // Validate date format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: "صيغة التاريخ غير صحيحة" }, { status: 400 });
        }

        // Validate employee exists
        const emp = await queryOne<{ id: string }>(
            "SELECT id FROM hr_employees WHERE id = ? AND status = 'active'",
            [employee_id]
        );
        if (!emp) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        // Format times as DATETIME strings (YYYY-MM-DD HH:MM:SS)
        const formatDateTime = (timeStr: string | null | undefined, dateStr: string): string | null => {
            if (!timeStr) return null;
            // timeStr could be HH:MM or HH:MM:SS
            const clean = timeStr.trim().slice(0, 5); // HH:MM
            return `${dateStr} ${clean}:00`;
        };

        const checkInDT = formatDateTime(check_in, date);
        const checkOutDT = formatDateTime(check_out, date);

        // Calculate late/overtime if times provided
        let lateMinutes = 0;
        let overtimeMinutes = 0;
        let finalStatus = status || "present";

        if (checkInDT) {
            // Get shift info
            const empShift = await queryOne<{ shift_id: string | null }>(
                "SELECT shift_id FROM hr_employees WHERE id = ?",
                [employee_id]
            );

            let workStartStr = "09:00";
            let workEndStr = "17:00";

            if (empShift?.shift_id) {
                const shift = await queryOne<{ start_time: string; end_time: string }>(
                    "SELECT start_time, end_time FROM hr_shifts WHERE id = ?",
                    [empShift.shift_id]
                );
                if (shift) {
                    workStartStr = shift.start_time.slice(0, 5);
                    workEndStr = shift.end_time.slice(0, 5);
                }
            } else {
                const startSetting = await queryOne<{ setting_value: string }>(
                    "SELECT setting_value FROM hr_settings WHERE setting_key = 'work_start_time'"
                );
                const endSetting = await queryOne<{ setting_value: string }>(
                    "SELECT setting_value FROM hr_settings WHERE setting_key = 'work_end_time'"
                );
                if (startSetting?.setting_value) workStartStr = startSetting.setting_value.slice(0, 5);
                if (endSetting?.setting_value) workEndStr = endSetting.setting_value.slice(0, 5);
            }

            const toMinutes = (t: string) => {
                const [h, m] = t.split(":").map(Number);
                return h * 60 + m;
            };

            const checkInTime = check_in?.slice(0, 5);
            if (checkInTime) {
                const diff = toMinutes(checkInTime) - toMinutes(workStartStr);
                if (diff > 0) {
                    lateMinutes = diff;
                    if (!status) finalStatus = "late";
                }
            }

            if (checkOutDT && check_out) {
                const checkOutTime = check_out.slice(0, 5);
                const diff = toMinutes(checkOutTime) - toMinutes(workEndStr);
                if (diff > 0) overtimeMinutes = diff;
            }
        }

        // Check if record exists
        const existing = await queryOne<{ id: string }>(
            "SELECT id FROM hr_attendance WHERE employee_id = ? AND date = ?",
            [employee_id, date]
        );

        if (existing) {
            // Update existing
            await execute(
                `UPDATE hr_attendance 
                 SET check_in = ?, check_out = ?, status = ?, late_minutes = ?, overtime_minutes = ?, notes = ?
                 WHERE id = ?`,
                [checkInDT, checkOutDT, finalStatus, lateMinutes, overtimeMinutes, notes || null, existing.id]
            );
        } else {
            // Insert new
            await execute(
                `INSERT INTO hr_attendance 
                 (id, employee_id, date, check_in, check_out, status, late_minutes, overtime_minutes, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    generateUUID(),
                    employee_id,
                    date,
                    checkInDT,
                    checkOutDT,
                    finalStatus,
                    lateMinutes,
                    overtimeMinutes,
                    notes || null
                ]
            );
        }

        return NextResponse.json({ success: true, message: "تم حفظ سجل الحضور بنجاح" });

    } catch (error: unknown) {
        console.error("Manual attendance error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "خطأ في الخادم" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/hr/attendance/manual?date=YYYY-MM-DD
 * Get all employees with their attendance for a specific date.
 */
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "التاريخ مطلوب بصيغة YYYY-MM-DD" }, { status: 400 });
    }

    try {
        const { query } = await import("@/lib/db");
        const data = await query(
            `SELECT 
                e.id,
                e.full_name,
                e.department,
                e.job_title,
                a.id as attendance_id,
                a.check_in,
                a.check_out,
                a.status,
                a.late_minutes,
                a.overtime_minutes,
                a.notes,
                COALESCE(
                    s.start_time,
                    (SELECT setting_value FROM hr_settings WHERE setting_key = 'work_start_time' LIMIT 1),
                    '09:00'
                ) as shift_start,
                COALESCE(
                    s.end_time,
                    (SELECT setting_value FROM hr_settings WHERE setting_key = 'work_end_time' LIMIT 1),
                    '17:00'
                ) as shift_end
             FROM hr_employees e
             LEFT JOIN users u ON e.user_id = u.id
             LEFT JOIN hr_attendance a ON e.id = a.employee_id AND a.date = ?
             LEFT JOIN hr_shifts s ON e.shift_id = s.id
             WHERE e.status = 'active'
             AND (u.role IS NULL OR u.role NOT IN ('super_admin', 'accountant'))
             ORDER BY e.full_name ASC`,
            [date]
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("Fetch attendance error:", error);
        return NextResponse.json({ error: "خطأ في جلب البيانات" }, { status: 500 });
    }
}
