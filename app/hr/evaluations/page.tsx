"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Trophy, Settings, Loader2, Calendar, FileText, Download } from "lucide-react";

export default function EvaluationsDashboard() {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterMonth, setFilterMonth] = useState("");
    const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
    const [searchTerm, setSearchTerm] = useState("");

    const fetchEvaluations = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (filterMonth) query.append("month", filterMonth);
            if (filterYear) query.append("year", filterYear);

            const res = await fetch(`/api/hr/evaluations?${query.toString()}`);
            const data = await res.json();
            setEvaluations(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvaluations();
    }, [filterMonth, filterYear]);

    const filteredEvaluations = evaluations.filter(ev => 
        ev.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getScoreColor = (percentage: number) => {
        if (percentage >= 90) return "text-emerald-600 bg-emerald-50";
        if (percentage >= 75) return "text-blue-600 bg-blue-50";
        if (percentage >= 60) return "text-yellow-600 bg-yellow-50";
        return "text-red-600 bg-red-50";
    };

    const getScoreLabel = (percentage: number) => {
        if (percentage >= 90) return "ممتاز";
        if (percentage >= 75) return "جيد جداً";
        if (percentage >= 60) return "جيد";
        return "ضعيف";
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تقييم الأداء الشهري</h1>
                    <p className="text-gray-500">إدارة وتقييم أداء الموظفين وفق معايير قابلة للتخصيص</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/hr/evaluations/templates"
                        className="flex items-center gap-2 bg-white border hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition"
                    >
                        <Settings className="w-5 h-5" />
                        <span>قوالب التقييم</span>
                    </Link>
                    <Link
                        href="/hr/evaluations/new"
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl transition shadow-lg shadow-violet-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span>تقييم موظف</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ابحث باسم الموظف أو القسم..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="">كل الأشهر</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-SA', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : filteredEvaluations.length > 0 ? (
                    <div className="divide-y overflow-x-auto">
                        <table className="w-full text-right whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-medium">الموظف</th>
                                    <th className="px-6 py-4 font-medium">الشهر/السنة</th>
                                    <th className="px-6 py-4 font-medium">قالب التقييم</th>
                                    <th className="px-6 py-4 font-medium">النتيجة النهائية</th>
                                    <th className="px-6 py-4 font-medium text-center">التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredEvaluations.map((ev) => {
                                    const percentage = parseFloat(ev.percentage) || 0;
                                    return (
                                        <tr key={ev.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                                                        {ev.employee_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{ev.employee_name}</p>
                                                        <p className="text-xs text-gray-500">{ev.department} - {ev.job_title}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    {new Date(ev.eval_year, ev.eval_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {ev.template_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-lg">{percentage.toFixed(1)}%</span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getScoreColor(percentage)}`}>
                                                            {getScoreLabel(percentage)}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-gray-500">
                                                        ({ev.total_score} من أصل {ev.max_possible_score})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Link
                                                    href={`/hr/evaluations/${ev.id}`}
                                                    className="inline-flex items-center justify-center p-2 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition"
                                                >
                                                    <FileText className="w-5 h-5" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد تقييمات</h3>
                        <p className="text-gray-500">لم يتم إضافة أي تقييمات أداء عن هذه الفترة.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
