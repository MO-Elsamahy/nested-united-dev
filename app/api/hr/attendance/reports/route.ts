
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";

interface EmployeeForReport {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
    shift_id: string | null;
}

interface AttendanceRecord {
    date: string;
    status: string;
    late_minutes: number | null;
    overtime_minutes: number | null;
}

interface ReportRow {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
    working_days: number;      // أيام العمل المفترضة (إجمالي الأيام - أيام الراحة)
    off_days: number;          // أيام الراحة الأسبوعية في الشهر
    present_days: number;      // حضر (present + late)
    absent_days: number;       // غائب (سجل غياب + أيام بلا سجل)
    leave_days: number;        // إجازة
    total_late_minutes: number;
    total_overtime_minutes: number;
    attendance_rate: number;   // نسبة الحضور %
}

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
        const department = searchParams.get("department");

        // ─── جلب الموظفين النشطين (بدون super_admin و accountant) ───
        let empSql = `
            SELECT e.id, e.full_name, e.department, e.job_title, e.shift_id
            FROM hr_employees e
            LEFT JOIN users u ON e.user_id = u.id
            WHERE e.status = 'active'
              AND (u.role IS NULL OR u.role NOT IN ('super_admin', 'accountant'))
        `;
        const empParams: (string | number)[] = [];
        if (department) {
            empSql += " AND e.department = ?";
            empParams.push(department);
        }
        empSql += " ORDER BY e.full_name ASC";

        const employees = await query<EmployeeForReport>(empSql, empParams);

        // ─── حساب نطاق الأيام ───
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const now = new Date();
        // إضافة UTC+3
        const localNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        const isCurrentMonth =
            localNow.getUTCMonth() + 1 === month && localNow.getUTCFullYear() === year;

        // لو الشهر الحالي: نحسب لغاية أمس فقط (لا نحسب اليوم كغياب)
        // لو شهر ماضي: نحسب كل الأيام
        const endCheckDay = isCurrentMonth
            ? Math.min(localNow.getUTCDate() - 1, lastDayOfMonth)
            : lastDayOfMonth;

        const results: ReportRow[] = [];

        for (const emp of employees) {
            // ─── جلب سجلات الحضور للشهر ───
            const attendanceRecords = await query<AttendanceRecord>(`
                SELECT DATE(date) as date, status, late_minutes, overtime_minutes
                FROM hr_attendance
                WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
            `, [emp.id, month, year]);

            // ─── أيام الراحة الأسبوعية من الوردية أو الإعدادات الافتراضية ───
            let offDaysIndices: number[] = [];
            if (emp.shift_id) {
                const shift = await queryOne<{ days_off: string }>(
                    "SELECT days_off FROM hr_shifts WHERE id = ?",
                    [emp.shift_id]
                );
                if (shift?.days_off) {
                    offDaysIndices = shift.days_off
                        .split(",")
                        .filter(Boolean)
                        .map(Number);
                }
            } else {
                // Fallback: استخدم الإعداد الافتراضي من hr_settings
                const defaultOff = await queryOne<{ setting_value: string }>(
                    "SELECT setting_value FROM hr_settings WHERE setting_key = 'default_days_off'"
                );
                if (defaultOff?.setting_value) {
                    offDaysIndices = defaultOff.setting_value
                        .split(",")
                        .filter(Boolean)
                        .map(Number);
                } else {
                    // إذا لم يُضبط إعداد، نفترض جمعة + سبت (5, 6) — الإجازة الأسبوعية الافتراضية
                    offDaysIndices = [5, 6];
                }
            }

            // ─── تهيئة العدادات ───
            let presentDays = 0;
            let absentDays = 0;
            let leaveDays = 0;
            let offDaysInCheckedPeriod = 0;  // أيام الراحة ضمن الفترة المحسوبة فقط
            let offDaysInFullMonth = 0;      // أيام الراحة في الشهر كله (للعرض)
            let totalLateMinutes = 0;
            let totalOvertimeMinutes = 0;

            // ─── المرور على كل أيام الشهر ───
            for (let d = 1; d <= lastDayOfMonth; d++) {
                const checkDate = new Date(year, month - 1, d);
                const dayOfWeek = checkDate.getDay(); // 0=Sun .. 6=Sat

                // 1. يوم راحة أسبوعي؟
                if (offDaysIndices.includes(dayOfWeek)) {
                    offDaysInFullMonth++;
                    // لو في الفترة المحسوبة نحسبه كراحة هناك أيضاً
                    if (d <= endCheckDay) offDaysInCheckedPeriod++;
                    continue;
                }

                // 2. يوم مستقبلي (اليوم الحالي أو ما بعده في الشهر الحالي)؟
                if (d > endCheckDay) {
                    // لا نحسبه غياباً — لم يحن وقته بعد
                    continue;
                }

                // 3. ابحث عن سجل حضور لهذا اليوم
                const att = attendanceRecords.find((r) => {
                    // r.date قد يكون Date object أو string
                    const rDate = new Date(r.date);
                    return rDate.getFullYear() === year &&
                        rDate.getMonth() + 1 === month &&
                        rDate.getDate() === d;
                });

                if (att) {
                    totalLateMinutes += Number(att.late_minutes || 0);
                    totalOvertimeMinutes += Number(att.overtime_minutes || 0);

                    if (att.status === "present" || att.status === "late") {
                        presentDays++;
                    } else if (att.status === "absent") {
                        absentDays++;
                    } else if (att.status === "leave") {
                        leaveDays++;
                    }
                } else {
                    // 4. لا يوجد سجل + ليس يوم راحة → غياب حقيقي
                    absentDays++;
                }
            }

            // ─── أيام العمل المفترضة (ضمن الفترة المحسوبة فقط) ───
            // = أيام من 1 إلى endCheckDay ناقص أيام الراحة في نفس الفترة
            const workingDays = Math.max(0, endCheckDay - offDaysInCheckedPeriod);

            // ─── نسبة الحضور (حضور / أيام عمل فعلية) ───
            const attendanceRate =
                workingDays > 0
                    ? Math.round((presentDays / workingDays) * 100)
                    : 0;

            results.push({
                id: emp.id,
                full_name: emp.full_name,
                department: emp.department,
                job_title: emp.job_title,
                working_days: workingDays,
                off_days: offDaysInCheckedPeriod,  // أيام الراحة فعلاً في الفترة المحسوبة (1..endCheckDay)
                present_days: presentDays,
                absent_days: absentDays,
                leave_days: leaveDays,
                total_late_minutes: totalLateMinutes,
                total_overtime_minutes: totalOvertimeMinutes,
                attendance_rate: attendanceRate,
            });
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error("Attendance report error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
