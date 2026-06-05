
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
    working_days: number;       // أيام العمل طول الشهر (= أيام الشهر - أيام الراحة)
    off_days: number;           // أيام الراحة الأسبوعية طول الشهر
    present_days: number;       // حضر (present + late) — من الأيام اللي عدت فقط
    absent_days: number;        // غائب (سجل غياب أو يوم عدى بدون سجل) — من الأيام اللي عدت فقط
    leave_days: number;         // إجازة — من الأيام اللي عدت فقط
    total_late_minutes: number;
    total_overtime_minutes: number;
    attendance_rate: number;    // نسبة الحضور % (حضور / أيام عمل عدت فعلاً)
}

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
        const year  = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
        const department = searchParams.get("department");

        // ─── جلب الموظفين النشطين ───
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

        // ─── حدود الشهر ───
        const lastDayOfMonth = new Date(year, month, 0).getDate(); // عدد أيام الشهر

        // اليوم الحالي بتوقيت UTC+3
        const localNow = new Date(new Date().getTime() + 3 * 60 * 60 * 1000);
        const isCurrentMonth =
            localNow.getUTCMonth() + 1 === month && localNow.getUTCFullYear() === year;

        // آخر يوم نحسب عنه غياب/حضور:
        // - شهر ماضي → كل الشهر
        // - شهر حالي → لغاية أمس (اليوم الحالي لسه مكملش)
        const lastCheckedDay = isCurrentMonth
            ? Math.min(localNow.getUTCDate() - 1, lastDayOfMonth)
            : lastDayOfMonth;

        // جلب default_days_off مرة واحدة (للموظفين بدون وردية)
        const defaultOffSetting = await queryOne<{ setting_value: string }>(
            "SELECT setting_value FROM hr_settings WHERE setting_key = 'default_days_off'"
        );
        const defaultOffDays: number[] = defaultOffSetting?.setting_value
            ? defaultOffSetting.setting_value.split(",").filter(Boolean).map(Number)
            : [5, 6]; // جمعة + سبت افتراضياً

        const results: ReportRow[] = [];

        for (const emp of employees) {
            // ─── 1. أيام الراحة من الوردية ───
            let offDaysIndices: number[] = [];
            if (emp.shift_id) {
                const shift = await queryOne<{ days_off: string }>(
                    "SELECT days_off FROM hr_shifts WHERE id = ?",
                    [emp.shift_id]
                );
                offDaysIndices = shift?.days_off
                    ? shift.days_off.split(",").filter(Boolean).map(Number)
                    : defaultOffDays;
            } else {
                offDaysIndices = defaultOffDays;
            }

            // ─── 2. حساب أيام العمل وأيام الراحة طول الشهر كله ───
            let offDaysTotal   = 0; // أيام الراحة في الشهر كله
            let workingDays    = 0; // أيام العمل في الشهر كله

            for (let d = 1; d <= lastDayOfMonth; d++) {
                const dow = new Date(year, month - 1, d).getDay();
                if (offDaysIndices.includes(dow)) {
                    offDaysTotal++;
                } else {
                    workingDays++;
                }
            }

            // ─── 3. جلب سجلات الحضور للشهر ───
            const attendanceRecords = await query<AttendanceRecord>(`
                SELECT DATE(date) as date, status, late_minutes, overtime_minutes
                FROM hr_attendance
                WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
            `, [emp.id, month, year]);

            // ─── 4. حساب الحضور والغياب من الأيام اللي عدت فعلاً ───
            let presentDays        = 0;
            let absentDays         = 0;
            let leaveDays          = 0;
            let totalLateMinutes   = 0;
            let totalOvertimeMinutes = 0;

            for (let d = 1; d <= lastCheckedDay; d++) {
                const dow = new Date(year, month - 1, d).getDay();

                // يوم راحة → تجاهل (مش يوم عمل)
                if (offDaysIndices.includes(dow)) continue;

                // ابحث عن سجل لهذا اليوم
                const att = attendanceRecords.find((r) => {
                    const rDate = new Date(r.date);
                    return rDate.getFullYear() === year
                        && rDate.getMonth() + 1 === month
                        && rDate.getDate() === d;
                });

                if (att) {
                    totalLateMinutes     += Number(att.late_minutes || 0);
                    totalOvertimeMinutes += Number(att.overtime_minutes || 0);
                    if (att.status === "present" || att.status === "late") {
                        presentDays++;
                    } else if (att.status === "absent") {
                        absentDays++;
                    } else if (att.status === "leave") {
                        leaveDays++;
                    }
                } else {
                    // يوم عمل عدى بدون سجل → غياب
                    absentDays++;
                }
            }

            // ─── 5. نسبة الحضور ───
            // من أيام العمل اللي عدت فعلاً (مش كل أيام العمل في الشهر)
            const elapsedWorkDays = presentDays + absentDays + leaveDays;
            const attendanceRate = elapsedWorkDays > 0
                ? Math.round((presentDays / elapsedWorkDays) * 100)
                : 0;

            results.push({
                id:                    emp.id,
                full_name:             emp.full_name,
                department:            emp.department,
                job_title:             emp.job_title,
                working_days:          workingDays,        // طول الشهر كله
                off_days:              offDaysTotal,        // طول الشهر كله
                present_days:          presentDays,
                absent_days:           absentDays,
                leave_days:            leaveDays,
                total_late_minutes:    totalLateMinutes,
                total_overtime_minutes: totalOvertimeMinutes,
                attendance_rate:       attendanceRate,
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
