
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";

interface AttendanceReportRow {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
    working_days: number;
    off_days: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    total_late_minutes: number;
    total_overtime_minutes: number;
    attendance_rate: number;
}

const MONTHS = [
    "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function fmtMinutes(mins: number) {
    if (!mins) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}س ${m}د`;
    return `${m}د`;
}

function RateBadge({ rate }: { rate: number }) {
    let cls = "bg-green-100 text-green-700";
    if (rate < 60) cls = "bg-red-100 text-red-700";
    else if (rate < 85) cls = "bg-yellow-100 text-yellow-700";
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>
            {rate}%
        </span>
    );
}

export default function AttendanceReportsPage() {
    const [report, setReport] = useState<AttendanceReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [department, setDepartment] = useState("");

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                month: month.toString(),
                year: year.toString(),
            });
            if (department) params.append("department", department);
            const res = await fetch(`/api/hr/attendance/reports?${params}`);
            const data = await res.json();
            setReport(Array.isArray(data) ? data : []);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [month, year, department]);

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    // إجماليات
    const totals = report.reduce(
        (acc, r) => ({
            working: acc.working + r.working_days,
            present: acc.present + r.present_days,
            absent: acc.absent + r.absent_days,
            leave: acc.leave + r.leave_days,
            late: acc.late + r.total_late_minutes,
            overtime: acc.overtime + r.total_overtime_minutes,
        }),
        { working: 0, present: 0, absent: 0, leave: 0, late: 0, overtime: 0 }
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/hr/attendance" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">تقارير الحضور الشهرية</h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        {MONTHS[month - 1]} {year} — {report.length} موظف
                    </p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                >
                    <Download className="w-4 h-4" />
                    طباعة
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i + 1} value={i + 1}>{m}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 bg-white"
                    >
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="بحث بالقسم..."
                        className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            {!loading && report.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                        <p className="text-xs text-gray-500 mb-1">إجمالي أيام الحضور</p>
                        <p className="text-2xl font-bold text-green-600">{totals.present}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                        <p className="text-xs text-gray-500 mb-1">إجمالي أيام الغياب</p>
                        <p className="text-2xl font-bold text-red-600">{totals.absent}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                        <p className="text-xs text-gray-500 mb-1">إجمالي التأخير</p>
                        <p className="text-2xl font-bold text-yellow-600">{fmtMinutes(totals.late)}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                        <p className="text-xs text-gray-500 mb-1">إجمالي الإضافي</p>
                        <p className="text-2xl font-bold text-blue-600">{fmtMinutes(totals.overtime)}</p>
                    </div>
                </div>
            )}

            {/* Report Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الموظف</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">أيام العمل</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الراحة</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الحضور</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الغياب</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الإجازات</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">التأخير</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">الإضافي</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-600 whitespace-nowrap">نسبة الحضور</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-gray-400">
                                        جاري التحميل...
                                    </td>
                                </tr>
                            ) : report.length > 0 ? (
                                report.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        {/* الموظف */}
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900">{row.full_name}</p>
                                            <p className="text-xs text-gray-400">{row.department} — {row.job_title}</p>
                                        </td>
                                        {/* أيام العمل المفترضة */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-medium text-gray-700">{row.working_days}</span>
                                        </td>
                                        {/* أيام الراحة */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                                                {row.off_days}
                                            </span>
                                        </td>
                                        {/* الحضور */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                                                {row.present_days}
                                            </span>
                                        </td>
                                        {/* الغياب */}
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full font-medium ${
                                                row.absent_days > 0
                                                    ? "bg-red-50 text-red-700"
                                                    : "bg-gray-50 text-gray-400"
                                            }`}>
                                                {row.absent_days}
                                            </span>
                                        </td>
                                        {/* الإجازات */}
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-indigo-600 font-medium">
                                                {row.leave_days > 0 ? row.leave_days : "—"}
                                            </span>
                                        </td>
                                        {/* التأخير */}
                                        <td className="px-4 py-3 text-center font-mono">
                                            <span className={row.total_late_minutes > 0 ? "text-yellow-600 font-bold" : "text-gray-300"}>
                                                {fmtMinutes(row.total_late_minutes)}
                                            </span>
                                        </td>
                                        {/* الإضافي */}
                                        <td className="px-4 py-3 text-center font-mono">
                                            <span className={row.total_overtime_minutes > 0 ? "text-blue-600 font-bold" : "text-gray-300"}>
                                                {fmtMinutes(row.total_overtime_minutes)}
                                            </span>
                                        </td>
                                        {/* نسبة الحضور */}
                                        <td className="px-4 py-3 text-center">
                                            <RateBadge rate={row.attendance_rate} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-gray-400">
                                        لا توجد بيانات لهذا الشهر
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {/* صف الإجماليات */}
                        {!loading && report.length > 0 && (
                            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                                <tr>
                                    <td className="px-4 py-3 text-gray-700">الإجمالي ({report.length} موظف)</td>
                                    <td className="px-4 py-3 text-center text-gray-700">{totals.working}</td>
                                    <td className="px-4 py-3 text-center text-gray-500">—</td>
                                    <td className="px-4 py-3 text-center text-green-700">{totals.present}</td>
                                    <td className="px-4 py-3 text-center text-red-700">{totals.absent}</td>
                                    <td className="px-4 py-3 text-center text-indigo-700">{totals.leave}</td>
                                    <td className="px-4 py-3 text-center text-yellow-700 font-mono">{fmtMinutes(totals.late)}</td>
                                    <td className="px-4 py-3 text-center text-blue-700 font-mono">{fmtMinutes(totals.overtime)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <RateBadge rate={totals.working > 0 ? Math.round((totals.present / totals.working) * 100) : 0} />
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}
