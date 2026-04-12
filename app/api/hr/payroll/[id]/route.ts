
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";

// GET: Get Single Payroll Details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const run = await queryOne("SELECT * FROM hr_payroll_runs WHERE id = ?", [id]);
        if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const details = await query(`
            SELECT d.*, e.full_name, e.department, e.job_title, e.bank_name, e.iban 
            FROM hr_payroll_details d
            JOIN hr_employees e ON d.employee_id = e.id
            WHERE d.payroll_run_id = ?
            ORDER BY e.full_name
        `, [id]);

        return NextResponse.json({ run, details });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Approve / Delete Payroll
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { action } = await request.json(); // "approve" or "delete"

        const run = await queryOne<any>("SELECT * FROM hr_payroll_runs WHERE id = ?", [id]);
        if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (action === "approve") {
            if (run.status !== 'draft') {
                return NextResponse.json({ error: "Can only approve draft payrolls" }, { status: 400 });
            }

            // Fetch HR settings for accounting integration
            const settingsRows = await query<any>("SELECT * FROM hr_settings");
            const settings: Record<string, string> = {};
            settingsRows?.forEach((s: any) => settings[s.setting_key] = s.setting_value);

            const salaryExpenseAccountId = settings['salary_expense_account_id'];
            const salaryPayableAccountId = settings['salary_payable_account_id'];
            const salaryJournalId = settings['salary_journal_id'];
            const gosiExpenseAccountId = settings['gosi_expense_account_id'];   // optional — employer GOSI
            const gosiEmployerRate = parseFloat(settings['gosi_employer_rate'] || '12.5');

            // Validate that accounting integration is configured
            if (!salaryExpenseAccountId || !salaryPayableAccountId || !salaryJournalId) {
                return NextResponse.json({
                    error: "Accounting integration not configured. Please set up salary accounts and journal in HR settings.",
                    details: {
                        missing: {
                            expense_account: !salaryExpenseAccountId,
                            payable_account: !salaryPayableAccountId,
                            journal: !salaryJournalId
                        }
                    }
                }, { status: 400 });
            }

            // Aggregate payroll details to compute employer GOSI base
            // Employer GOSI = gosiEmployerRate% of (basic_salary + housing_allowance) per employee
            const detailsAgg = await query<any>(
                `SELECT SUM(basic_salary + housing_allowance) AS gosi_base FROM hr_payroll_details WHERE payroll_run_id = ?`,
                [id]
            );
            const gosiBase = Number(detailsAgg?.[0]?.gosi_base ?? 0);
            const employerGosiAmount = gosiBase * (gosiEmployerRate / 100);

            try {
                // Update payroll status
                await execute(
                    "UPDATE hr_payroll_runs SET status = 'approved', approved_by = ?, approved_at = NOW() WHERE id = ?",
                    [session.user.id, id]
                );

                // Create Accounting Journal Entry
                const moveId = generateUUID();
                const approvalDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const netSalaryTotal = Number(run.total_amount) || 0;

                // Total liability = net salaries + employer GOSI (company's cash out)
                const totalLiability = netSalaryTotal + employerGosiAmount;

                // Create the move header
                await execute(
                    `INSERT INTO accounting_moves (id, journal_id, date, ref, narration, state, amount_total, created_by)
                     VALUES (?, ?, ?, ?, ?, 'posted', ?, ?)`,
                    [
                        moveId,
                        salaryJournalId,
                        approvalDate,
                        `PAYROLL-${run.period_month}-${run.period_year}`,
                        `مسير رواتب ${run.period_month}/${run.period_year} — ${run.total_employees} موظف`,
                        totalLiability,
                        session.user.id
                    ]
                );

                // ── Line 1: Debit — مصروف رواتب (net salaries paid to employees) ──
                await execute(
                    `INSERT INTO accounting_move_lines (id, move_id, account_id, name, debit, credit)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        generateUUID(), moveId,
                        salaryExpenseAccountId,
                        `مصروف رواتب — ${run.period_month}/${run.period_year}`,
                        netSalaryTotal, 0
                    ]
                );

                // ── Line 2 (optional): Debit — مصروف GOSI صاحب العمل ──
                if (gosiExpenseAccountId && employerGosiAmount > 0) {
                    await execute(
                        `INSERT INTO accounting_move_lines (id, move_id, account_id, name, debit, credit)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            generateUUID(), moveId,
                            gosiExpenseAccountId,
                            `مصروف GOSI صاحب العمل (${gosiEmployerRate}%) — ${run.period_month}/${run.period_year}`,
                            employerGosiAmount, 0
                        ]
                    );
                }

                // ── Line 3: Credit — رواتب مستحقة الدفع (total cash to be paid out) ──
                await execute(
                    `INSERT INTO accounting_move_lines (id, move_id, account_id, name, debit, credit)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        generateUUID(), moveId,
                        salaryPayableAccountId,
                        `رواتب مستحقة الدفع — ${run.period_month}/${run.period_year}`,
                        0,
                        (gosiExpenseAccountId && employerGosiAmount > 0)
                            ? totalLiability  // net + employer gosi
                            : netSalaryTotal  // net only if no gosi account configured
                    ]
                );

                // Link the accounting move to the payroll run
                await execute(
                    "UPDATE hr_payroll_runs SET accounting_move_id = ? WHERE id = ?",
                    [moveId, id]
                );

                // Create audit log
                await execute(
                    `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                     VALUES (?, ?, 'create', 'move', ?, ?)`,
                    [
                        generateUUID(),
                        session.user.id,
                        moveId,
                        JSON.stringify({
                            source: 'payroll_approval',
                            payroll_run_id: id,
                            period: `${run.period_month}/${run.period_year}`,
                            net_salary_total: netSalaryTotal,
                            employer_gosi: employerGosiAmount
                        })
                    ]
                );

                return NextResponse.json({
                    success: true,
                    accounting_move_id: moveId,
                    employer_gosi_amount: employerGosiAmount,
                    message: "تم اعتماد المسير وإنشاء القيد المحاسبي بنجاح"
                });

            } catch (error: any) {
                // Rollback the approval if accounting entry fails
                await execute(
                    "UPDATE hr_payroll_runs SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = ?",
                    [id]
                );

                console.error("Accounting integration error:", error);
                return NextResponse.json({
                    error: "Failed to create accounting entry. Payroll approval rolled back.",
                    details: error.message
                }, { status: 500 });
            }
        }

        if (action === "update_line") {
            if (run.status !== 'draft') {
                return NextResponse.json({ error: "Can only update draft payrolls" }, { status: 400 });
            }

            const { detail_id, custom_deduction, custom_deduction_note, custom_addition, custom_addition_note } = await request.json();

            // Fetch the detail line
            const detail = await queryOne<any>("SELECT * FROM hr_payroll_details WHERE id = ? AND payroll_run_id = ?", [detail_id, id]);
            if (!detail) return NextResponse.json({ error: "Detail not found" }, { status: 404 });

            const newCustomDeduction = Number(custom_deduction || 0);
            const newCustomAddition = Number(custom_addition || 0);

            // Recalculate employee totals
            // total_deductions = absence + late + gosi + custom_deduction
            const totalDeductions = Number(detail.absence_deduction) + Number(detail.late_deduction) + Number(detail.gosi_deduction) + newCustomDeduction;
            
            // net_salary = (gross + overtime + custom_addition) - total_deductions
            const netSalary = (Number(detail.gross_salary) + Number(detail.overtime_amount) + newCustomAddition) - totalDeductions;

            // Update the detail line
            await execute(`
                UPDATE hr_payroll_details 
                SET custom_deduction = ?, custom_deduction_note = ?, 
                    custom_addition = ?, custom_addition_note = ?,
                    total_deductions = ?, net_salary = ?
                WHERE id = ?
            `, [newCustomDeduction, custom_deduction_note || null, newCustomAddition, custom_addition_note || null, totalDeductions, netSalary, detail_id]);

            // Update the run header total
            const totalAgg = await queryOne<any>("SELECT SUM(net_salary) as total_amount FROM hr_payroll_details WHERE payroll_run_id = ?", [id]);
            await execute("UPDATE hr_payroll_runs SET total_amount = ? WHERE id = ?", [totalAgg.total_amount, id]);

            return NextResponse.json({ success: true, net_salary: netSalary, total_amount: totalAgg.total_amount });
        }

        if (action === "delete") {
            if (run.status === 'approved' || run.status === 'paid') {
                return NextResponse.json({ error: "Cannot delete approved/paid payrolls" }, { status: 400 });
            }
            // Cascade delete handles details usually, but let's be safe
            // Schema has ON DELETE CASCADE on details? Yes.
            await execute("DELETE FROM hr_payroll_runs WHERE id = ?", [id]);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
