import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await context.params;
        const format = req.nextUrl.searchParams.get("format") ?? "csv"; // "csv" or "xlsx"

        const run = await queryOne<any>("SELECT * FROM hr_payroll_runs WHERE id = ?", [id]);
        if (!run) {
            return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
        }

        const details = await query<any>(`
            SELECT d.*, e.full_name, e.job_title, e.department, e.bank_name, e.iban
            FROM hr_payroll_details d
            JOIN hr_employees e ON d.employee_id = e.id
            WHERE d.payroll_run_id = ?
            ORDER BY e.full_name
        `, [id]);

        const periodLabel = new Date(run.period_year, run.period_month - 1)
            .toLocaleString("ar-EG", { month: "long", year: "numeric" });

        // Arabic column headers
        const ARABIC_HEADERS = [
            "اسم الموظف",
            "المسمى الوظيفي",
            "القسم",
            "الراتب الأساسي",
            "بدل السكن",
            "بدل المواصلات",
            "بدلات أخرى",
            "الراتب الإجمالي",
            "إضافي",
            "خصم غياب",
            "أيام الغياب",
            "خصم تأخير",
            "تأمينات (GOSI)",
            "إجمالي الخصومات",
            "صافي الراتب",
            "اسم البنك",
            "رقم IBAN",
        ];

        const rows = details.map((d: any) => [
            d.full_name ?? "",
            d.job_title ?? "",
            d.department ?? "",
            Number(d.basic_salary).toFixed(2),
            Number(d.housing_allowance).toFixed(2),
            Number(d.transport_allowance).toFixed(2),
            Number(d.other_allowances).toFixed(2),
            Number(d.gross_salary).toFixed(2),
            Number(d.overtime_amount).toFixed(2),
            Number(d.absence_deduction).toFixed(2),
            d.absent_days ?? 0,
            Number(d.late_deduction).toFixed(2),
            Number(d.gosi_deduction).toFixed(2),
            Number(d.total_deductions).toFixed(2),
            Number(d.net_salary).toFixed(2),
            d.bank_name ?? "",
            d.iban ?? "",
        ]);

        const filename = `payroll_${run.period_month}_${run.period_year}`;

        // ─── CSV ───────────────────────────────────────────────────────────────
        if (format === "csv") {
            const csvLines = [
                `# مسير رواتب - ${periodLabel}`,
                ARABIC_HEADERS.join(","),
                ...rows.map((r: (string | number)[]) =>
                    r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
                ),
            ].join("\r\n");

            // BOM (0xEF 0xBB 0xBF) so Excel opens Arabic correctly
            const BOM = "\uFEFF";
            return new NextResponse(BOM + csvLines, {
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename="${filename}.csv"`,
                },
            });
        }

        // ─── XLSX ──────────────────────────────────────────────────────────────
        const wb = XLSX.utils.book_new();

        // Title row + blank row + headers + data rows
        const wsData: (string | number)[][] = [
            [`مسير رواتب - ${periodLabel}`],
            [],
            ARABIC_HEADERS,
            ...rows,
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // RTL sheet direction
        if (!ws["!sheetView"]) ws["!sheetView"] = [];
        (ws as any)["!sheetView"] = [{ rightToLeft: true }];

        // Merge title across all columns
        const colCount = ARABIC_HEADERS.length;
        ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];

        // Column widths (auto-sized to ~20 chars each, Arabic names need more)
        ws["!cols"] = [
            { wch: 24 }, // اسم الموظف
            { wch: 22 }, // المسمى الوظيفي
            { wch: 16 }, // القسم
            { wch: 14 }, // الراتب الأساسي
            { wch: 12 }, // بدل السكن
            { wch: 14 }, // بدل المواصلات
            { wch: 12 }, // بدلات أخرى
            { wch: 14 }, // الراتب الإجمالي
            { wch: 10 }, // إضافي
            { wch: 12 }, // خصم غياب
            { wch: 10 }, // أيام الغياب
            { wch: 12 }, // خصم تأخير
            { wch: 14 }, // تأمينات
            { wch: 14 }, // إجمالي الخصومات
            { wch: 14 }, // صافي الراتب
            { wch: 18 }, // اسم البنك
            { wch: 26 }, // رقم IBAN
        ];

        XLSX.utils.book_append_sheet(wb, ws, `رواتب ${periodLabel}`);

        const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(xlsxBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
            },
        });

    } catch (error: any) {
        console.error("Export error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
