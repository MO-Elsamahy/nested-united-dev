
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";

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
        const settingsRows = await query<any>("SELECT * FROM hr_settings");
        const settings: Record<string, string> = {};
        settingsRows?.forEach((s: any) => settings[s.setting_key] = s.setting_value);

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
            // 5.1 Get Attendance Stats for this Month
            const attendance = await queryOne<any>(`
        SELECT 
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
            COALESCE(SUM(late_minutes), 0) as total_late_minutes,
            COALESCE(SUM(overtime_minutes), 0) as total_overtime_minutes
        FROM hr_attendance 
        WHERE employee_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
      `, [emp.id, month, year]);

            const basic = Number(emp.basic_salary) || 0;
            const housing = Number(emp.housing_allowance) || 0;
            const transport = Number(emp.transport_allowance) || 0;
            const other = Number(emp.other_allowances) || 0;

            const gross = basic + housing + transport + other;

            // Calculations
            const dailyRate = basic / 30; // Labor law usually uses 30 days for fixed salary
            const hourlyRate = dailyRate / 8;

            // Deductions
            const absentDays = attendance?.absent_days || 0;
            const absenceDeduction = dailyRate * absentDays;

            const lateMinutes = attendance?.total_late_minutes || 0;
            // Simple Late Formula: Deduct minute for minute (or use custom policy)
            // Implementation: (Basic / 30 / 8 / 60) * late_minutes
            const minuteRate = hourlyRate / 60;
            const lateDeduction = minuteRate * lateMinutes;

            // GOSI (Social Insurance)
            // Usually calculated on (Basic + Housing)
            const gosiBase = basic + housing;
            const gosiDeduction = gosiBase * (gosiRate / 100);

            const totalDeductions = absenceDeduction + lateDeduction + gosiDeduction;

            // Additions (Overtime)
            const overtimeMinutes = attendance?.total_overtime_minutes || 0;
            const overtimeAmount = (minuteRate * overtimeRate) * overtimeMinutes;

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
