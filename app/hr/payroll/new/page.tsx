
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Play } from "lucide-react";

export default function NewPayrollPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/hr/payroll", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, year }),
            });

            const data = await res.json();

            if (res.ok) {
                router.push(`/hr/payroll/${data.id}`);
            } else {
                alert(data.error || "حدث خطأ");
            }
        } catch (error) {
            alert("فشل الاتصال");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/hr/payroll" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إنشاء مسير جديد</h1>
                    <p className="text-gray-500">حساب الرواتب للشهر المحدد</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-bold text-blue-800 mb-2">كيف يعمل النظام؟</h3>
                    <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                        <li>سيقوم النظام بحساب الرواتب لجميع الموظفين النشطين.</li>
                        <li>يتم احتساب الخصومات (الغياب، التأخير، التأمينات) تلقائياً.</li>
                        <li>يتم إضافة العمل الإضافي بناءً على سجل الحضور.</li>
                        <li>يمكنك مراجعة المسير كمسودة قبل الاعتماد النهائي.</li>
                    </ul>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500"
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
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500"
                            >
                                {[2024, 2025, 2026, 2027].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white py-3 rounded-xl font-bold shadow-lg transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                        <span>بدء الاحتساب وإنشاء المسودة</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
