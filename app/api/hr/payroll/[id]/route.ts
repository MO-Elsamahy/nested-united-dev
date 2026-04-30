import type { ResultSetHeader } from "mysql2";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID, executeTransaction } from "@/lib/db";
import { resolvePayrollAccountingIntegration } from "@/lib/hr-payroll-accounting-defaults";
import { loadHrSettingsMap } from "@/lib/hr-settings";
import { insertHrPayrollRunLog, ensureHrPayrollRunLogsTable } from "@/lib/hr-payroll-run-logs";
import { PayrollRun, PayrollDetail, PayrollLog } from "@/lib/types/hr";

// GET: Get Single Payroll Details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const run = await queryOne<PayrollRun>("SELECT * FROM hr_payroll_runs WHERE id = ?", [id]);
        if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

        const details = await query<PayrollDetail>(`
            SELECT d.*, e.full_name, e.department, e.job_title, e.bank_name, e.iban 
            FROM hr_payroll_details d
            JOIN hr_employees e ON d.employee_id = e.id
            WHERE d.payroll_run_id = ?
            ORDER BY e.full_name
        `, [id]);

        await ensureHrPayrollRunLogsTable();
        const logs = await query<PayrollLog>(
            `SELECT l.id, l.payroll_run_id, l.user_id, l.action, l.note, l.meta, l.created_at,
                    u.name AS user_name
             FROM hr_payroll_run_logs l
             LEFT JOIN users u ON l.user_id = u.id
             WHERE l.payroll_run_id = ?
             ORDER BY l.created_at DESC`,
            [id]
        );

        return NextResponse.json({ run, details, logs });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
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
        const body = await request.json().catch(() => ({}));
        const action = body?.action;

        const run = await queryOne<PayrollRun>("SELECT * FROM hr_payroll_runs WHERE id = ?", [id]);
        if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });

        if (action === "approve") {
            if (run.status !== 'draft') {
                return NextResponse.json({ error: "Can only approve draft payrolls" }, { status: 400 });
            }

            // Fetch HR settings for accounting integration
            const settings = await loadHrSettingsMap();

            const gosiExpenseAccountId = settings["gosi_expense_account_id"]; // optional — employer GOSI
            const gosiEmployerRate = parseFloat(String(settings["gosi_employer_rate"] || "12.5"));

            const resolved = await resolvePayrollAccountingIntegration(settings);
            const salaryExpenseAccountId = resolved.salaryExpenseAccountId;
            const salaryPayableAccountId = resolved.salaryPayableAccountId;
            const salaryJournalId = resolved.salaryJournalId;

            if (!salaryExpenseAccountId || !salaryPayableAccountId || !salaryJournalId) {
                return NextResponse.json(
                    {
                        error:
                            "لم يُضبط الربط المحاسبي للرواتب في إعدادات الموارد البشرية، ولم يُعثر تلقائياً على يومية/حسابات بالرمز SAL (الرواتب والأجور). أنشئ يومية بكود SAL وحساب مصروف رواتب وحساب مستحقات، أو عيّنها يدوياً من إعدادات HR.",
                        details: {
                            missing: {
                                expense_account: !salaryExpenseAccountId,
                                payable_account: !salaryPayableAccountId,
                                journal: !salaryJournalId,
                            },
                        },
                    },
                    { status: 400 }
                );
            }

            // Aggregate payroll details to compute employer GOSI base
            // Employer GOSI = gosiEmployerRate% of (basic_salary + housing_allowance) per employee
            const detailsAgg = await query<{ gosi_base: number | string }>(
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
                const periodRef = `SAL-${run.period_year}-${String(run.period_month).padStart(2, "0")}`;
                await execute(
                    `INSERT INTO accounting_moves (id, journal_id, date, ref, narration, state, amount_total, created_by)
                     VALUES (?, ?, ?, ?, ?, 'posted', ?, ?)`,
                    [
                        moveId,
                        salaryJournalId,
                        approvalDate,
                        periodRef,
                        `يومية SAL — مسير رواتب ${run.period_month}/${run.period_year} (${run.total_employees} موظف)`,
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

                try {
                    await insertHrPayrollRunLog({
                        payrollRunId: id,
                        userId: session.user.id,
                        action: "approved",
                        meta: {
                            accounting_move_id: moveId,
                            period: `${run.period_month}/${run.period_year}`,
                            net_salary_total: netSalaryTotal,
                            employer_gosi: employerGosiAmount,
                        },
                    });
                } catch (logErr) {
                    console.error("hr_payroll_run_logs (approve):", logErr);
                }

                return NextResponse.json({
                    success: true,
                    accounting_move_id: moveId,
                    employer_gosi_amount: employerGosiAmount,
                    message: "تم اعتماد المسير وإنشاء القيد المحاسبي بنجاح"
                });

            } catch (error: unknown) {
                // Rollback the approval if accounting entry fails
                await execute(
                    "UPDATE hr_payroll_runs SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = ?",
                    [id]
                );
    
                console.error("Accounting integration error:", error);
                return NextResponse.json({
                    error: "Failed to create accounting entry. Payroll approval rolled back.",
                    details: error instanceof Error ? error.message : "Internal Server Error"
                }, { status: 500 });
            }
        }

        if (action === "revert_approval") {
            if (run.status !== "approved") {
                return NextResponse.json(
                    {
                        error:
                            run.status === "paid"
                                ? "لا يمكن إلغاء اعتماد مسير حالته «مدفوع». تواصل مع المحاسبة."
                                : "إلغاء الاعتماد متاح فقط للمسيرات المعتمدة (ليست مسودة).",
                    },
                    { status: 400 }
                );
            }

            const revertNote =
                typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : null;
            const moveId = run.accounting_move_id as string | null | undefined;
            let clearedConfirmations = 0;

            try {
                await executeTransaction(async (conn) => {
                    if (moveId) {
                        await conn.execute(
                            `UPDATE accounting_moves SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
                            [moveId]
                        );
                    }

                    await conn.execute(
                        `UPDATE hr_payroll_runs
                         SET status = 'draft', approved_by = NULL, approved_at = NULL, accounting_move_id = NULL
                         WHERE id = ?`,
                        [id]
                    );

                    const [clearRes] = await conn.execute(
                        `UPDATE hr_payroll_details
                         SET salary_confirmed_at = NULL, salary_confirmed_by = NULL
                         WHERE payroll_run_id = ? AND salary_confirmed_at IS NOT NULL`,
                        [id]
                    );
                    clearedConfirmations = (clearRes as ResultSetHeader).affectedRows ?? 0;

                    await insertHrPayrollRunLog(
                        {
                            payrollRunId: id,
                            userId: session.user.id,
                            action: "reverted_approval",
                            note: revertNote || null,
                            meta: {
                                previous_accounting_move_id: moveId ?? null,
                                period: `${run.period_month}/${run.period_year}`,
                                cleared_salary_confirmations: clearedConfirmations,
                            },
                        },
                        conn
                    );

                    if (moveId) {
                        await conn.execute(
                            `INSERT INTO accounting_audit_logs (id, user_id, action, entity_type, entity_id, details)
                             VALUES (?, ?, 'delete', 'move', ?, ?)`,
                            [
                                generateUUID(),
                                session.user.id,
                                moveId,
                                JSON.stringify({
                                    source: "payroll_revert_approval",
                                    payroll_run_id: id,
                                    accounting_move_id: moveId,
                                    note: revertNote || undefined,
                                }),
                            ]
                        );
                    }
                });

                return NextResponse.json({
                    success: true,
                    message: "تم إلغاء اعتماد المسير وإخفاء القيد المحاسبي من التقارير. يمكنك التعديل ثم إعادة الاعتماد.",
                    cleared_salary_confirmations: clearedConfirmations,
                });
            } catch (error: unknown) {
                console.error("Payroll revert_approval error:", error);
                return NextResponse.json(
                    { error: "تعذر إلغاء الاعتماد.", details: error instanceof Error ? error.message : "Internal Server Error" },
                    { status: 500 }
                );
            }
        }

        if (action === "update_line") {
            if (run.status !== 'draft') {
                return NextResponse.json({ error: "Can only update draft payrolls" }, { status: 400 });
            }

            const {
                detail_id,
                basic_salary, housing_allowance, transport_allowance, other_allowances,
                overtime_amount, absence_deduction, late_deduction, _gosi_deduction,
                custom_addition, custom_addition_note,
                custom_deduction, custom_deduction_note
            } = body;

            // Fetch the detail line
            const detail = await queryOne<PayrollDetail>("SELECT * FROM hr_payroll_details WHERE id = ? AND payroll_run_id = ?", [detail_id, id]);
            if (!detail) return NextResponse.json({ error: "Detail not found" }, { status: 404 });

            // Use provided values or original ones if not provided
            const nBasic = Number(basic_salary ?? detail.basic_salary);
            const nHousing = Number(housing_allowance ?? detail.housing_allowance);
            const nTransport = Number(transport_allowance ?? detail.transport_allowance);
            const nOther = Number(other_allowances ?? detail.other_allowances);
            const nOvertime = Number(overtime_amount ?? detail.overtime_amount);
            const nAbsence = Number(absence_deduction ?? detail.absence_deduction);
            const nLate = Number(late_deduction ?? detail.late_deduction);
            const nGosi = 0; // Always 0 per user request
            const nCustomAdd = Number(custom_addition ?? detail.custom_addition);
            const nCustomDed = Number(custom_deduction ?? detail.custom_deduction);

            // Recalculate gross and totals
            const grossSalary = nBasic + nHousing + nTransport + nOther;
            const totalDeductions = nAbsence + nLate + nGosi + nCustomDed;
            const netSalary = (grossSalary + nOvertime + nCustomAdd) - totalDeductions;

            // Update the detail line
            await execute(`
                UPDATE hr_payroll_details 
                SET basic_salary = ?, housing_allowance = ?, transport_allowance = ?, other_allowances = ?,
                    overtime_amount = ?, absence_deduction = ?, late_deduction = ?, gosi_deduction = ?,
                    custom_addition = ?, custom_addition_note = ?, 
                    custom_deduction = ?, custom_deduction_note = ?,
                    gross_salary = ?, total_deductions = ?, net_salary = ?
                WHERE id = ?
            `, [
                nBasic, nHousing, nTransport, nOther,
                nOvertime, nAbsence, nLate, nGosi,
                nCustomAdd, custom_addition_note ?? detail.custom_addition_note,
                nCustomDed, custom_deduction_note ?? detail.custom_deduction_note,
                grossSalary, totalDeductions, netSalary, detail_id
            ]);

            // Update the run header total
            const totalAgg = await queryOne<{ total_amount: number | string }>("SELECT SUM(net_salary) as total_amount FROM hr_payroll_details WHERE payroll_run_id = ?", [id]);
            await execute("UPDATE hr_payroll_runs SET total_amount = ? WHERE id = ?", [totalAgg?.total_amount || 0, id]);

            return NextResponse.json({ 
                success: true, 
                net_salary: netSalary, 
                total_deductions: totalDeductions,
                total_amount: totalAgg?.total_amount || 0
            });
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

    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
