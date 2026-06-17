"use client";

import { useState } from "react";
import { BarChart3, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface MonthRow {
    year: number;
    month: number;
    label: string;
    revenue: number;
    expenses: number;
    net: number;
}

interface CostCenterRow {
    id: string | null;
    code: string | null;
    name: string;
    revenue: number;
    expenses: number;
    net: number;
}

interface Totals {
    revenue: number;
    expenses: number;
    net: number;
}

interface MonthlyData {
    group_by: "month";
    period: { from: string; to: string };
    months: MonthRow[];
    totals: Totals;
}

interface CostCenterData {
    group_by: "cost_center";
    period: { from: string; to: string };
    cost_centers: CostCenterRow[];
    totals: Totals;
}

type ReportData = MonthlyData | CostCenterData;

export default function RevenueExpensesPage() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [groupBy, setGroupBy] = useState<"month" | "cost_center">("month");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ReportData | null>(null);
    const [error, setError] = useState("");

    const formatDate = (dateStr: string) => {
        if (!dateStr) return dateStr;
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatCurrency = (amount: number) => {
        const abs = Math.abs(amount);
        const formatted = abs.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (amount < 0) return `− ${formatted} ر.س`;
        return `${formatted} ر.س`;
    };

    const handleGenerate = async () => {
        if (!fromDate || !toDate) {
            setError("يرجى تحديد تاريخ البداية والنهاية");
            return;
        }
        setLoading(true);
        setError("");
        setData(null);

        try {
            const res = await fetch(
                `/api/accounting/reports/revenue-expenses?from_date=${fromDate}&to_date=${toDate}&group_by=${groupBy}`
            );
            const result = await res.json();
            if (!res.ok) {
                setError(result.error || "فشل في توليد التقرير");
            } else {
                setData(result);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "حدث خطأ أثناء توليد التقرير");
        } finally {
            setLoading(false);
        }
    };

    const netColor = (net: number) =>
        net >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">تقرير الإيرادات والتكاليف</h1>
                    <p className="text-gray-500 mt-1">Revenue & Expenses - Detailed Analysis</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <label className="text-gray-700 font-medium">من تاريخ:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-gray-700 font-medium">إلى تاريخ:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-gray-700 font-medium">تجميع بـ:</label>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as "month" | "cost_center")}
                            className="border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none"
                        >
                            <option value="month">الشهر</option>
                            <option value="cost_center">مركز التكلفة</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition"
                    >
                        <BarChart3 className="w-5 h-5" />
                        {loading ? "جاري الإنشاء..." : "إنشاء التقرير"}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Report Display */}
            {data && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    {/* Report Header */}
                    <div className="p-6 pb-4 border-b bg-gray-50 text-center">
                        <h2 className="text-xl font-bold text-gray-900">تقرير الإيرادات والتكاليف</h2>
                        <p className="text-gray-500 mt-1 text-sm">
                            من {formatDate(data.period.from)} إلى {formatDate(data.period.to)}
                            {" · "}
                            {data.group_by === "month" ? "تجميع شهري" : "تجميع بمراكز التكلفة"}
                        </p>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-100 border-b font-bold text-gray-700">
                                <tr>
                                    <th className="px-6 py-3">
                                        {data.group_by === "month" ? "الشهر" : "مركز التكلفة"}
                                    </th>
                                    <th className="px-6 py-3 text-green-700">الإيرادات</th>
                                    <th className="px-6 py-3 text-red-700">المصروفات</th>
                                    <th className="px-6 py-3">صافي الربح / الخسارة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.group_by === "month"
                                    ? (data as MonthlyData).months.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-800">{row.label}</td>
                                            <td className="px-6 py-3 text-green-700">{formatCurrency(row.revenue)}</td>
                                            <td className="px-6 py-3 text-red-600">{formatCurrency(row.expenses)}</td>
                                            <td className={`px-6 py-3 ${netColor(row.net)}`}>
                                                {row.net >= 0 ? "+" : ""}{formatCurrency(row.net)}
                                            </td>
                                        </tr>
                                    ))
                                    : (data as CostCenterData).cost_centers.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-800">
                                                {row.code && (
                                                    <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2 text-gray-500">
                                                        {row.code}
                                                    </span>
                                                )}
                                                {row.name}
                                            </td>
                                            <td className="px-6 py-3 text-green-700">{formatCurrency(row.revenue)}</td>
                                            <td className="px-6 py-3 text-red-600">{formatCurrency(row.expenses)}</td>
                                            <td className={`px-6 py-3 ${netColor(row.net)}`}>
                                                {row.net >= 0 ? "+" : ""}{formatCurrency(row.net)}
                                            </td>
                                        </tr>
                                    ))
                                }
                            </tbody>
                            {/* Totals Row */}
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                <tr className="font-bold text-base">
                                    <td className="px-6 py-4 text-gray-900">الإجمالي</td>
                                    <td className="px-6 py-4 text-green-700">{formatCurrency(data.totals.revenue)}</td>
                                    <td className="px-6 py-4 text-red-600">{formatCurrency(data.totals.expenses)}</td>
                                    <td className={`px-6 py-4 text-lg ${netColor(data.totals.net)}`}>
                                        {data.totals.net >= 0 ? "+" : ""}{formatCurrency(data.totals.net)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Summary Cards */}
                    <div className="p-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                            <p className="text-green-600 text-sm font-medium mb-1">إجمالي الإيرادات</p>
                            <p className="text-2xl font-bold text-green-700">{formatCurrency(data.totals.revenue)}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                            <p className="text-red-600 text-sm font-medium mb-1">إجمالي المصروفات</p>
                            <p className="text-2xl font-bold text-red-700">{formatCurrency(data.totals.expenses)}</p>
                        </div>
                        <div className={`rounded-xl p-4 border-2 ${data.totals.net >= 0 ? "bg-violet-50 border-violet-300" : "bg-orange-50 border-orange-300"}`}>
                            <p className={`text-sm font-medium mb-1 ${data.totals.net >= 0 ? "text-violet-600" : "text-orange-600"}`}>
                                {data.totals.net >= 0 ? "✓ صافي ربح" : "✗ صافي خسارة"}
                            </p>
                            <p className={`text-2xl font-bold ${data.totals.net >= 0 ? "text-violet-700" : "text-orange-700"}`}>
                                {formatCurrency(Math.abs(data.totals.net))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {data && (
                (data.group_by === "month" && (data as MonthlyData).months.length === 0) ||
                (data.group_by === "cost_center" && (data as CostCenterData).cost_centers.length === 0)
            ) && (
                <div className="bg-white rounded-2xl border p-12 text-center">
                    <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">لا توجد بيانات في هذه الفترة</p>
                </div>
            )}
        </div>
    );
}
