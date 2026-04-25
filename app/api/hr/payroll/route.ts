
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { loadHrSettingsMap } from "@/lib/hr-settings";

// GET: List all payroll runs
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const runs = await query(`
        SELECT p.*, u.name as created_by_name, u2.name as approved_by_name 
        FROM hr_payroll_runs p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN users u2 ON p.approved_by = u2.id
        ORDER BY p.period_year DESC, p.period_month DESC
    `);
        return NextResponse.json(runs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Generate a NEW Payroll Run
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { month, year } = await request.json();

        if (!month || !year) {
            return NextResponse.json({ error: "Month and Year are required" }, { status: 400 });
        }

        // 1. Check if already exists
        const existing = await queryOne(
            "SELECT id FROM hr_payroll_runs WHERE period_month = ? AND period_year = ?",
            [month, year]
        );
        if (existing) {
            return NextResponse.json({ error: "تم إصدار مسير رواتب لهذه الفترة مسبقاً" }, { status: 400 });
        }

        // 2. Get Settings (Rates)
        const settingsRaw = await loadHrSettingsMap();
        const settings: Record<string, string> = Object.fromEntries(
            Object.entries(settingsRaw).map(([k, v]) => [k, v == null ? "" : String(v)])
        );

        const overtimeRate = parseFloat(settings['overtime_rate'] || '1.5');
        const gosiRate = parseFloat(settings['gosi_employee_rate'] || '9.75');
        const workingDays = parseInt(settings['working_days_per_month'] || '30'); // Standard 30 days usually allowed in labor law for calc

        // 3. Get Employees
        const employees = await query<any>("SELECT * FROM hr_employees WHERE status = 'active'");
        if (!employees || employees.length === 0) {
            return NextResponse.json({ error: "لا يوجد موظفين نشطين" }, { status: 400 });
        }

        // 4. Create Run Header
        const runId = generateUUID();
        await execute(
            `INSERT INTO hr_payroll_runs (id, period_month, period_year, status, created_by) VALUES (?, ?, ?, 'draft', ?)`,
            [runId, month, year, session.user.id]
        );

        let totalAmount = 0;
        let totalEmployees = 0;

        // 5. Loop Employees & Calculate
        for (const emp of employees) {
            // 5.1 Determine the Period to count absences
            const now = new Date();
            const lastDayOfMonth = new Date(year, month, 0).getDate();
            const isCurrentMonth = now.getMonth() + 1 === month && now.getFullYear() === year;
            const endCheckDay = isCurrentMonth ? Math.min(now.getDate() - 1, lastDayOfMonth) : lastDayOfMonth;

            // 5.2 Get Attendance Records & Approved Leaves
            const attendanceRecords = await query<any>(`
                SELECT DATE(date) as date, status, late_minutes, overtime_minutes 
                FROM hr_attendance 
                WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
            `, [emp.id, month, year]);

            const approvedLeaves = await query<any>(`
                SELECT start_date, end_date 
                FROM hr_requests 
                WHERE employee_id = ? AND status = 'approved' AND request_type = 'leave'
                AND ((MONTH(start_date) = ? AND YEAR(start_date) = ?) OR (MONTH(end_date) = ? AND YEAR(end_date) = ?))
            `, [emp.id, month, year, month, year]);

            // Shift Days Off
            const shiftDaysOff = (emp.shift_id ? (await queryOne<any>("SELECT days_off FROM hr_shifts WHERE id = ?", [emp.shift_id]))?.days_off : "") || "";
            const offDaysIndices = shiftDaysOff.split(',').filter(Boolean).map(Number);

            let absentDays = 0;
            let totalLateMinutes = 0;
            let totalOvertimeMinutes = 0;

            // Iterate through every day of the month up to endCheckDay
            for (let d = 1; d <= endCheckDay; d++) {
                const checkDate = new Date(year, month - 1, d);
                const checkDateStr = checkDate.toISOString().split('T')[0];
                const dayIndex = checkDate.getDay();

                // Skip if it is a Day Off for the shift
                if (offDaysIndices.includes(dayIndex)) continue;

                // Check if there's an attendance record
                const att = attendanceRecords.find((r: any) => {
                    const rDate = new Date(r.date);
                    return rDate.getDate() === d;
                });

                if (att) {
                    totalLateMinutes += Number(att.late_minutes || 0);
                    totalOvertimeMinutes += Number(att.overtime_minutes || 0);
                    if (att.status === 'absent') absentDays++;
                } else {
                    // No attendance record found! Check if it's covered by an approved leave
                    const isOnLeave = approvedLeaves.some((l: any) => {
                        const start = new Date(l.start_date);
                        const end = new Date(l.end_date);
                        return checkDate >= start && checkDate <= end;
                    });

                    if (!isOnLeave) {
                        // Truly absent
                        absentDays++;
                    }
                }
            }

            // Also add attendance records for the remaining part of the month (if past month)
            // if d was > endCheckDay but <= lastDayOfMonth (e.g. for already recorded data)
            for (let d = endCheckDay + 1; d <= lastDayOfMonth; d++) {
                const att = attendanceRecords.find((r: any) => {
                    const rDate = new Date(r.date);
                    return rDate.getDate() === d;
                });
                if (att) {
                    totalLateMinutes += Number(att.late_minutes || 0);
                    totalOvertimeMinutes += Number(att.overtime_minutes || 0);
                    if (att.status === 'absent') absentDays++;
                }
            }

            const basic = Number(emp.basic_salary) || 0;
            const housing = Number(emp.housing_allowance) || 0;
            const transport = Number(emp.transport_allowance) || 0;
            const other = Number(emp.other_allowances) || 0;

            const gross = basic + housing + transport + other;

            // Calculations
            const dailyRate = basic / 30; 
            const hourlyRate = dailyRate / 8;
            const minuteRate = hourlyRate / 60;

            // Deductions
            const absenceDeduction = dailyRate * absentDays;
            const lateDeduction = minuteRate * totalLateMinutes;
            const gosiDeduction = 0;

            const totalDeductions = absenceDeduction + lateDeduction + gosiDeduction;

            // Additions (Overtime)
            const overtimeAmount = (minuteRate * overtimeRate) * totalOvertimeMinutes;

            // Net
            const netSalary = (gross + overtimeAmount) - totalDeductions;

            // Insert Detail
            const detailId = generateUUID();
            await execute(`
        INSERT INTO hr_payroll_details 
        (id, payroll_run_id, employee_id, basic_salary, housing_allowance, transport_allowance, other_allowances, 
         overtime_amount, absence_deduction, late_deduction, gosi_deduction, gross_salary, total_deductions, net_salary,
         absent_days, late_days)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                detailId, runId, emp.id, basic, housing, transport, other,
                overtimeAmount, absenceDeduction, lateDeduction, gosiDeduction, gross, totalDeductions, netSalary,
                absentDays, 0 // late_days not strictly counted here as integer, but Minutes used.
            ]);

            totalAmount += netSalary;
            totalEmployees++;
        }

        // 6. Update Header with Totals
        await execute(
            "UPDATE hr_payroll_runs SET total_employees = ?, total_amount = ? WHERE id = ?",
            [totalEmployees, totalAmount, runId]
        );

        return NextResponse.json({ success: true, id: runId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
