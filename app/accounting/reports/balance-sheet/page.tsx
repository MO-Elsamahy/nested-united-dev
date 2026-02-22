"use client";

import { useState, useEffect } from "react";
import { FileBarChart, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function BalanceSheetPage() {
    const [asOfDate, setAsOfDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState("");

    // Set default date to today
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setAsOfDate(today);
    }, []);

    const handleGenerate = async () => {
        if (!asOfDate) {
            setError("Please select a date");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `/api/accounting/reports/balance-sheet?as_of_date=${asOfDate}`
            );
            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Failed to generate report");
                setData(null);
            } else {
                setData(result);
            }
        } catch (err: any) {
            setError("An error occurred while generating the report");
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
                <h1 className="text-3xl font-bold text-gray-900">الميزانية العمومية</h1>
                <p className="text-gray-500 mt-1">Balance Sheet - Statement of Financial Position</p>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <label className="text-gray-700 font-medium">كما في تاريخ (As of):</label>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
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
                        <h2 className="text-2xl font-bold text-gray-900">الميزانية العمومية</h2>
                        <p className="text-gray-600 mt-1">كما في {data.as_of_date}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Assets Section */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                                الأصول (Assets)
                            </h3>
                            {data.assets.accounts.length > 0 ? (
                                <div className="space-y-2">
                                    {data.assets.accounts.map((acc: any) => (
                                        <div key={acc.id} className="flex justify-between items-center py-2">
                                            <span className="text-gray-700 text-sm">
                                                {acc.code} - {acc.name}
                                            </span>
                                            <span className="font-semibold text-blue-600">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-bold text-lg">
                                        <span className="text-gray-900">إجمالي الأصول</span>
                                        <span className="text-blue-600">
                                            {formatCurrency(data.assets.total)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">لا توجد أصول</p>
                            )}
                        </div>

                        {/* Liabilities & Equity Section */}
                        <div className="space-y-6">
                            {/* Liabilities */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-orange-500">
                                    الخصوم (Liabilities)
                                </h3>
                                {data.liabilities.accounts.length > 0 ? (
                                    <div className="space-y-2">
                                        {data.liabilities.accounts.map((acc: any) => (
                                            <div key={acc.id} className="flex justify-between items-center py-2">
                                                <span className="text-gray-700 text-sm">
                                                    {acc.code} - {acc.name}
                                                </span>
                                                <span className="font-semibold text-orange-600">
                                                    {formatCurrency(acc.balance)}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-bold">
                                            <span className="text-gray-900">إجمالي الخصوم</span>
                                            <span className="text-orange-600">
                                                {formatCurrency(data.liabilities.total)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic text-sm">لا توجد خصوم</p>
                                )}
                            </div>

                            {/* Equity */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-500">
                                    حقوق الملكية (Equity)
                                </h3>
                                <div className="space-y-2">
                                    {data.equity.accounts.map((acc: any) => (
                                        <div key={acc.id} className="flex justify-between items-center py-2">
                                            <span className="text-gray-700 text-sm">
                                                {acc.code} - {acc.name}
                                            </span>
                                            <span className="font-semibold text-purple-600">
                                                {formatCurrency(acc.balance)}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-gray-700 text-sm">الأرباح المحتجزة</span>
                                        <span className="font-semibold text-purple-600">
                                            {formatCurrency(data.equity.retained_earnings)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-t-2 border-gray-200 font-bold text-lg">
                                        <span className="text-gray-900">إجمالي حقوق الملكية</span>
                                        <span className="text-purple-600">
                                            {formatCurrency(data.equity.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Balance Check */}
                    <div className={`mt-8 rounded-xl p-6 border-2 ${data.balance_check.is_balanced
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {data.balance_check.is_balanced ? (
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-red-600" />
                                )}
                                <span className="font-bold text-lg">
                                    {data.balance_check.is_balanced
                                        ? 'الميزانية متوازنة ✓'
                                        : 'الميزانية غير متوازنة ✗'
                                    }
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">المعادلة: الأصول = الخصوم + حقوق الملكية</p>
                                {!data.balance_check.is_balanced && (
                                    <p className="text-sm text-red-600 mt-1">
                                        الفرق: {formatCurrency(Math.abs(data.balance_check.difference))}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
