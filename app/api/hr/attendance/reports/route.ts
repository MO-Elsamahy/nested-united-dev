
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
    check_in?: string;
    check_out?: string;
}

// ─── Helper: جلب أيام الراحة للموظف ───
async function getOffDays(emp: EmployeeForReport, fallback: number[]): Promise<number[]> {
    if (emp.shift_id) {
        const sh = await queryOne<{ days_off: string }>(
            "SELECT days_off FROM hr_shifts WHERE id = ?",
            [emp.shift_id]
        );
        if (sh?.days_off) return sh.days_off.split(",").filter(Boolean).map(Number);
    }
    return fallback;
}

// ─── Helper: اليوم المحلي UTC+3 كـ string ───
function localToday(): string {
    return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const view       = searchParams.get("view") || "monthly"; // monthly | weekly | daily
        const month      = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
        const year       = parseInt(searchParams.get("year")  || String(new Date().getFullYear()));
        const dateParam  = searchParams.get("date");       // YYYY-MM-DD (daily)
        const dateFrom   = searchParams.get("date_from");  // YYYY-MM-DD (weekly)
        const dateTo     = searchParams.get("date_to");    // YYYY-MM-DD (weekly)
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
        if (department) { empSql += " AND e.department = ?"; empParams.push(department); }
        empSql += " ORDER BY e.full_name ASC";

        const employees = await query<EmployeeForReport>(empSql, empParams);

        // ─── default_days_off من hr_settings ───
        const defaultOffSetting = await queryOne<{ setting_value: string }>(
            "SELECT setting_value FROM hr_settings WHERE setting_key = 'default_days_off'"
        );
        const defaultOffDays: number[] = defaultOffSetting?.setting_value
            ? defaultOffSetting.setting_value.split(",").filter(Boolean).map(Number)
            : [5, 6]; // جمعة + سبت

        const today = localToday();

        // ═══════════════════════════════════════════════════
        // DAILY VIEW
        // ═══════════════════════════════════════════════════
        if (view === "daily") {
            const targetDate = dateParam || today;
            const [ty, tm, td] = targetDate.split("-").map(Number);

            const rows = await Promise.all(employees.map(async (emp) => {
                const offIdx = await getOffDays(emp, defaultOffDays);
                const dow    = new Date(ty, tm - 1, td).getDay();
                const isOff  = offIdx.includes(dow);

                const att = await queryOne<AttendanceRecord>(
                    "SELECT DATE(date) as date, status, late_minutes, overtime_minutes, check_in, check_out FROM hr_attendance WHERE employee_id = ? AND DATE(date) = ?",
                    [emp.id, targetDate]
                );

                let status: string;
                if (isOff)       status = "off";
                else if (att)    status = att.status;
                else if (targetDate >= today) status = "pending";
                else             status = "absent";

                return {
                    id: emp.id, full_name: emp.full_name,
                    department: emp.department, job_title: emp.job_title,
                    date: targetDate, status,
                    check_in:         att?.check_in        || null,
                    check_out:        att?.check_out       || null,
                    late_minutes:     att?.late_minutes    || 0,
                    overtime_minutes: att?.overtime_minutes || 0,
                };
            }));

            return NextResponse.json({ view: "daily", date: targetDate, rows });
        }

        // ═══════════════════════════════════════════════════
        // WEEKLY VIEW
        // ═══════════════════════════════════════════════════
        if (view === "weekly") {
            const toDate   = dateTo   || today;
            const fromDate = dateFrom || (() => {
                const d = new Date(toDate);
                d.setDate(d.getDate() - 6);
                return d.toISOString().split("T")[0];
            })();

            // بناء مصفوفة الأيام في النطاق
            const days: string[] = [];
            const cur = new Date(fromDate);
            const end = new Date(toDate);
            while (cur <= end) {
                days.push(cur.toISOString().split("T")[0]);
                cur.setDate(cur.getDate() + 1);
            }

            const rows = await Promise.all(employees.map(async (emp) => {
                const offIdx = await getOffDays(emp, defaultOffDays);

                // جلب سجلات الفترة دفعة واحدة
                const records = await query<AttendanceRecord>(`
                    SELECT DATE(date) as date, status, late_minutes, overtime_minutes
                    FROM hr_attendance
                    WHERE employee_id = ? AND DATE(date) BETWEEN ? AND ?
                `, [emp.id, fromDate, toDate]);

                let present = 0, absent = 0, leave = 0, offCount = 0;
                let totalLate = 0, totalOvertime = 0;

                const dailyDetail = days.map((dayStr) => {
                    const [dy, dm, dd] = dayStr.split("-").map(Number);
                    const dow = new Date(dy, dm - 1, dd).getDay();

                    if (offIdx.includes(dow)) {
                        offCount++;
                        return { date: dayStr, status: "off" };
                    }

                    const att = records.find((r) => {
                        const rd = new Date(r.date);
                        return rd.getFullYear() === dy && rd.getMonth() + 1 === dm && rd.getDate() === dd;
                    });

                    let status: string;
                    if (att) {
                        status = att.status;
                        totalLate     += Number(att.late_minutes || 0);
                        totalOvertime += Number(att.overtime_minutes || 0);
                        if (att.status === "present" || att.status === "late") present++;
                        else if (att.status === "absent") absent++;
                        else if (att.status === "leave") leave++;
                    } else {
                        status = dayStr >= today ? "pending" : "absent";
                        if (status === "absent") absent++;
                    }

                    return { date: dayStr, status };
                });

                return {
                    id: emp.id, full_name: emp.full_name,
                    department: emp.department, job_title: emp.job_title,
                    present_days: present, absent_days: absent,
                    leave_days: leave, off_days: offCount,
                    total_late_minutes: totalLate,
                    total_overtime_minutes: totalOvertime,
                    days: dailyDetail,
                };
            }));

            return NextResponse.json({ view: "weekly", date_from: fromDate, date_to: toDate, rows });
        }

        // ═══════════════════════════════════════════════════
        // MONTHLY VIEW (default)
        // ═══════════════════════════════════════════════════
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const localNow       = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const isCurrentMonth = localNow.getUTCMonth() + 1 === month && localNow.getUTCFullYear() === year;
        const lastCheckedDay = isCurrentMonth
            ? Math.min(localNow.getUTCDate() - 1, lastDayOfMonth)
            : lastDayOfMonth;

        const results = await Promise.all(employees.map(async (emp) => {
            const offIdx = await getOffDays(emp, defaultOffDays);

            // أيام العمل وأيام الراحة طول الشهر كله
            let offDaysTotal = 0, workingDays = 0;
            for (let d = 1; d <= lastDayOfMonth; d++) {
                const dow = new Date(year, month - 1, d).getDay();
                offIdx.includes(dow) ? offDaysTotal++ : workingDays++;
            }

            // سجلات الحضور
            const attendanceRecords = await query<AttendanceRecord>(`
                SELECT DATE(date) as date, status, late_minutes, overtime_minutes
                FROM hr_attendance
                WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
            `, [emp.id, month, year]);

            let presentDays = 0, absentDays = 0, leaveDays = 0;
            let totalLateMinutes = 0, totalOvertimeMinutes = 0;

            for (let d = 1; d <= lastCheckedDay; d++) {
                const dow = new Date(year, month - 1, d).getDay();
                if (offIdx.includes(dow)) continue; // يوم راحة

                const att = attendanceRecords.find((r) => {
                    const rd = new Date(r.date);
                    return rd.getFullYear() === year && rd.getMonth() + 1 === month && rd.getDate() === d;
                });

                if (att) {
                    totalLateMinutes     += Number(att.late_minutes || 0);
                    totalOvertimeMinutes += Number(att.overtime_minutes || 0);
                    if (att.status === "present" || att.status === "late") presentDays++;
                    else if (att.status === "absent") absentDays++;
                    else if (att.status === "leave")  leaveDays++;
                } else {
                    absentDays++; // يوم عمل عدى بدون سجل
                }
            }

            const elapsedWorkDays = presentDays + absentDays + leaveDays;
            const attendanceRate  = elapsedWorkDays > 0 ? Math.round((presentDays / elapsedWorkDays) * 100) : 0;

            return {
                id: emp.id, full_name: emp.full_name,
                department: emp.department, job_title: emp.job_title,
                working_days: workingDays, off_days: offDaysTotal,
                present_days: presentDays, absent_days: absentDays, leave_days: leaveDays,
                total_late_minutes: totalLateMinutes,
                total_overtime_minutes: totalOvertimeMinutes,
                attendance_rate: attendanceRate,
            };
        }));

        return NextResponse.json(results);

    } catch (error) {
        console.error("Attendance report error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
