
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Filter, Calendar } from "lucide-react";

export default function AttendanceReportsPage() {
    const [report, setReport] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [department, setDepartment] = useState("");

    const fetchReport = async () => {
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
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [month, year, department]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/hr/attendance"
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تقارير الحضور الشهرية</h1>
                    <p className="text-gray-500">ملخص حضور وانصراف الموظفين</p>
                </div>
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
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-EG', { month: 'long' })}</option>
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

            {/* Report Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">الموظف</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">أيام الحضور</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الغياب</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الإجازات</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إجمالي التأخير</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إجمالي الإضافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">جاري التحميل...</td>
                                </tr>
                            ) : report.length > 0 ? (
                                report.map((row: any) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900">{row.full_name}</p>
                                                <p className="text-xs text-gray-500">{row.department} - {row.job_title}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                                                {row.present_days} يوم
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${row.absent_days > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500"}`}>
                                                {row.absent_days} يوم
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-gray-600">{row.leave_days} يوم</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-mono ${row.total_late_minutes > 0 ? "text-yellow-600 font-bold" : "text-gray-400"}`}>
                                                {row.total_late_minutes} د
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-mono ${row.total_overtime_minutes > 0 ? "text-blue-600 font-bold" : "text-gray-400"}`}>
                                                {row.total_overtime_minutes} د
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        لا توجد بيانات لهذا الشهر
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
