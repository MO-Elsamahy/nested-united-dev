import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { queryOne, execute, generateUUID } from "@/lib/db";
import { Attendance, Shift, Employee } from "@/lib/types/hr";

// POST: تسجيل حضور أو انصراف
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { type } = body;
        let { employee_id } = body;

        if (!type) {
            return NextResponse.json({ error: "نوع العملية مطلوب" }, { status: 400 });
        }

        // Security Check: If not a manager, enforce punching for self only
        const userRole = user.role;
        const isManager = ["super_admin", "admin", "hr_manager", "accountant"].includes(userRole);

        if (!isManager || !employee_id) {
            // Find employee linked to this user
            const emp = await queryOne<{ id: string }>(
                "SELECT id FROM hr_employees WHERE user_id = ?",
                [user.id]
            );
            if (!emp) {
                return NextResponse.json({ error: "لا يوجد سجل موظف مرتبط بحسابك" }, { status: 404 });
            }
            
            // If they provided an ID but aren't a manager, or didn't provide one, use their own
            if (employee_id && employee_id !== emp.id && !isManager) {
                return NextResponse.json({ error: "غير مصرح لك بتسجيل الحضور لموظف آخر" }, { status: 403 });
            }
            
            employee_id = emp.id;
        }

        if (type !== "check_in" && type !== "check_out") {
            return NextResponse.json({ error: "نوع غير صالح" }, { status: 400 });
        }

        // Get server time (Adjust for UTC+3 for KSA/Egypt)
        const now = new Date();
        const localNow = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        const today = localNow.toISOString().split("T")[0];
        const currentTime = localNow.toISOString().slice(0, 19).replace("T", " ");

        // We also need the local hours/minutes for late/overtime calculation
        const localHours = localNow.getUTCHours();
        const localMinutes = localNow.getUTCMinutes();

        // Check if attendance record exists for today
        let existing = await queryOne<Attendance>(
            `SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ?`,
            [employee_id, today]
        );

        // Overnight Shift Support: If no record for today, check yesterday for an open check-in
        if (!existing && type === "check_out") {
            const yesterdayDate = new Date(localNow);
            yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
            const yesterday = yesterdayDate.toISOString().split("T")[0];
            
            existing = await queryOne<Attendance>(
                "SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ? AND check_out IS NULL",
                [employee_id, yesterday]
            );
        }

        // Get Employee Shift Info
        const employee = await queryOne<Employee>(
            "SELECT shift_id FROM hr_employees WHERE id = ?",
            [employee_id]
        );

        let workStartTimeStr = "09:00";
        let workEndTimeStr = "17:00";
        let lateGraceMinutes = 15;
        let shiftName = "Global Settings";

        if (employee?.shift_id) {
            const shift = await queryOne<Shift>(
                "SELECT * FROM hr_shifts WHERE id = ?",
                [employee.shift_id]
            );
            if (shift) {
                workStartTimeStr = shift.start_time; // HH:MM:SS
                workEndTimeStr = shift.end_time;     // HH:MM:SS
                lateGraceMinutes = shift.late_grace_minutes || 0;
                shiftName = shift.name;
            }
        } else {
            // Fallback to global settings
            const workStartSetting = await queryOne<{ setting_value: string }>(
                `SELECT setting_value FROM hr_settings WHERE setting_key = 'work_start_time'`
            );
            const workEndSetting = await queryOne<{ setting_value: string }>(
                `SELECT setting_value FROM hr_settings WHERE setting_key = 'work_end_time'`
            );
            const graceSetting = await queryOne<{ setting_value: string }>(
                `SELECT setting_value FROM hr_settings WHERE setting_key = 'late_grace_minutes'`
            );

            if (workStartSetting?.setting_value) workStartTimeStr = workStartSetting.setting_value;
            if (workEndSetting?.setting_value) workEndTimeStr = workEndSetting.setting_value;
            if (graceSetting?.setting_value) lateGraceMinutes = parseInt(graceSetting.setting_value);
        }

        // Helper to convert time string to minutes
        const timeToMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(":").map(Number);
            return h * 60 + m;
        }

        if (type === "check_in") {
            if (existing?.check_in) {
                return NextResponse.json({ error: "تم تسجيل الحضور مسبقاً لهذا اليوم" }, { status: 400 });
            }

            // Calculate late minutes
            let lateMinutes = 0;
            let status = "present";

            const workStartMinutes = timeToMinutes(workStartTimeStr) + lateGraceMinutes;
            const currentMinutes = localHours * 60 + localMinutes;

            if (currentMinutes > workStartMinutes) {
                lateMinutes = currentMinutes - (timeToMinutes(workStartTimeStr) + lateGraceMinutes); // Late relative to grace end? Or start? Usually start.
                // Correct logic: Late relative to start time.
                lateMinutes = currentMinutes - timeToMinutes(workStartTimeStr);

                // If less than 0 (which shouldn't happen due to if check above), revert to 0.
                // Actually standard practice: if you arrive AFTER grace period, you are late by the FULL amount.
                status = "late";
            }

            if (existing) {
                await execute(
                    `UPDATE hr_attendance SET check_in = ?, status = ?, late_minutes = ? WHERE id = ?`,
                    [currentTime, status, lateMinutes, existing.id]
                );
            } else {
                await execute(
                    `INSERT INTO hr_attendance (id, employee_id, date, check_in, status, late_minutes)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [generateUUID(), employee_id, today, currentTime, status, lateMinutes]
                );
            }

            return NextResponse.json({
                success: true,
                message: status === "late" ? `تم تسجيل الحضور (متأخر ${lateMinutes} دقيقة)` : "تم تسجيل الحضور بنجاح",
                time: currentTime,
                status,
                late_minutes: lateMinutes,
                applied_shift: shiftName
            });
        }

        if (type === "check_out") {
            if (!existing?.check_in) {
                return NextResponse.json({ error: "يجب تسجيل الحضور أولاً" }, { status: 400 });
            }
            if (existing?.check_out) {
                return NextResponse.json({ error: "تم تسجيل الانصراف مسبقاً" }, { status: 400 });
            }

            // Calculate overtime using LOCAL time
            let overtimeMinutes = 0;
            const workEndMinutes = timeToMinutes(workEndTimeStr);
            const localHours = localNow.getUTCHours();
            const localMinutes = localNow.getUTCMinutes();
            const currentMinutes = localHours * 60 + localMinutes;

            if (currentMinutes > workEndMinutes) {
                overtimeMinutes = currentMinutes - workEndMinutes;
            }

            await execute(
                `UPDATE hr_attendance SET check_out = ?, overtime_minutes = ? WHERE id = ?`,
                [currentTime, overtimeMinutes, existing.id]
            );

            return NextResponse.json({
                success: true,
                message: overtimeMinutes > 0
                    ? `تم تسجيل الانصراف (إضافي ${overtimeMinutes} دقيقة)`
                    : "تم تسجيل الانصراف بنجاح",
                time: currentTime,
                overtime_minutes: overtimeMinutes,
                applied_shift: shiftName
            });
        }

    } catch (error: unknown) {
        console.error("Attendance punch error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
