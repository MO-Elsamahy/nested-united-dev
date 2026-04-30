"use client";

import { useState } from "react";
import { FileBarChart, Calendar } from "lucide-react";

interface IncomeStatementAccount {
    id: string;
    code: string;
    name: string;
    amount: number;
}

interface IncomeStatementSection {
    accounts: IncomeStatementAccount[];
    total: number;
}

interface IncomeStatementData {
    period: { from: string; to: string };
    revenue: IncomeStatementSection;
    expenses: IncomeStatementSection;
    net_income: number;
}

export default function IncomeStatementPage() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<IncomeStatementData | null>(null);
    const [error, setError] = useState("");

    const handleGenerate = async () => {
        if (!fromDate || !toDate) {
            setError("Please select both from and to dates");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/accounting/reports/income-statement?from_date=${fromDate}&to_date=${toDate}`
            );
            const result = await response.json() as IncomeStatementData | { error: string };

            if (!response.ok) {
                setError(typeof result === "object" && "error" in result ? result.error : "Failed to generate report");
                setData(null);
            } else {
                setData(result as IncomeStatementData);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An error occurred while generating the report");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("ar-SA", {
            style: "currency",
            currency: "SAR",
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">قائمة الدخل</h1>
                <p className="text-gray-500 mt-1">Income Statement - Profit & Loss</p>
            </div>

            {/* Date Range Selector */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <label className="text-gray-700 font-medium">من تاريخ:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-gray-700 font-medium">إلى تاريخ:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="border rounded-lg px-3 py-2"
                        />
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                        <FileBarChart className="w-5 h-5" />
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
                <div className="bg-white rounded-2xl shadow-sm border p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">قائمة الدخل</h2>
                        <p className="text-gray-600 mt-1">
                            من {data.period.from} إلى {data.period.to}
                        </p>
                    </div>

                    {/* Revenue Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                            الإيرادات (Revenue)
                        </h3>
                        {data.revenue.accounts.length > 0 ? (
                            <div className="space-y-2">
                                {data.revenue.accounts.map((acc: IncomeStatementAccount) => (
                                    <div key={acc.id} className="flex justify-between items-center py-2">
                                        <span className="text-gray-700">
                                            {acc.code} - {acc.name}
                                        </span>
                                        <span className="font-semibold text-green-600">
                                            {formatCurrency(acc.amount)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-bold text-lg">
                                    <span className="text-gray-900">إجمالي الإيرادات</span>
                                    <span className="text-green-600">
                                        {formatCurrency(data.revenue.total)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">لا توجد إيرادات في هذه الفترة</p>
                        )}
                    </div>

                    {/* Expenses Section */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-red-500">
                            المصروفات (Expenses)
                        </h3>
                        {data.expenses.accounts.length > 0 ? (
                            <div className="space-y-2">
                                {data.expenses.accounts.map((acc: IncomeStatementAccount) => (
                                    <div key={acc.id} className="flex justify-between items-center py-2">
                                        <span className="text-gray-700">
                                            {acc.code} - {acc.name}
                                        </span>
                                        <span className="font-semibold text-red-600">
                                            {formatCurrency(acc.amount)}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-bold text-lg">
                                    <span className="text-gray-900">إجمالي المصروفات</span>
                                    <span className="text-red-600">
                                        {formatCurrency(data.expenses.total)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">لا توجد مصروفات في هذه الفترة</p>
                        )}
                    </div>

                    {/* Net Income */}
                    <div className="bg-gradient-to-r from-violet-50 to-blue-50 rounded-xl p-6 border-2 border-violet-200">
                        <div className="flex justify-between items-center">
                            <span className="text-xl font-bold text-gray-900">
                                صافي الدخل (Net Income)
                            </span>
                            <span className={`text-2xl font-bold ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(data.net_income)}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                            {data.net_income >= 0 ? '✓ ربح' : '✗ خسارة'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
