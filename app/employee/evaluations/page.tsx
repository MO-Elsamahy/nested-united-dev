"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Trophy, FileText, Loader2, Calendar } from "lucide-react";

export default function EmployeeEvaluationsPage() {
    const [evaluations, setEvaluations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvaluations = async () => {
            try {
                // The API route scopes it to "self" based on the referer/query param
                const res = await fetch("/api/hr/evaluations?scope=self");
                const data = await res.json();
                setEvaluations(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluations();
    }, []);

    const getScoreColor = (percentage: number) => {
        if (percentage >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
        if (percentage >= 75) return "text-blue-700 bg-blue-50 border-blue-200";
        if (percentage >= 60) return "text-yellow-700 bg-yellow-50 border-yellow-200";
        return "text-red-700 bg-red-50 border-red-200";
    };

    const getScoreLabel = (percentage: number) => {
        if (percentage >= 90) return "ممتاز";
        if (percentage >= 75) return "جيد جداً";
        if (percentage >= 60) return "جيد";
        return "ضعيف";
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/employee" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تقييماتي الشهرية</h1>
                    <p className="text-gray-500">سجل تقييمات الأداء الخاصة بك</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : evaluations.length > 0 ? (
                    evaluations.map(ev => {
                        const percentage = parseFloat(ev.percentage);
                        return (
                            <Link 
                                href={`/employee/evaluations/${ev.id}`} 
                                key={ev.id} 
                                className="block group"
                            >
                                <div className={`bg-white rounded-2xl border-2 p-6 transition shadow-sm hover:shadow-md ${getScoreColor(percentage).replace('bg-', 'hover:bg-').replace('text-', '')}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <Calendar className="w-5 h-5" />
                                            <span className="font-medium text-gray-900">
                                                {new Date(ev.eval_year, ev.eval_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                                            </span>
                                        </div>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getScoreColor(percentage)}`}>
                                            {getScoreLabel(percentage)}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-4xl font-black font-mono text-gray-900 group-hover:text-violet-700 transition">
                                            {percentage.toFixed(0)}%
                                        </span>
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 mb-4">
                                        {ev.total_score} من {ev.max_possible_score} بناءً على قالب {ev.template_name}
                                    </p>

                                    {ev.notes && (
                                        <div className="bg-gray-50 p-3 rounded-xl border line-clamp-2 text-sm text-gray-600 mt-2">
                                            {ev.notes}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-full bg-white rounded-2xl shadow-sm border flex flex-col items-center justify-center py-20 px-6 text-center">
                        <Trophy className="w-16 h-16 text-gray-200 mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد تقييمات حالياً</h3>
                        <p className="text-gray-500 max-w-sm">لم يتم اعتماد أي تقييمات شهرية خاصة بك في النظام حتى الآن.</p>
                    </div>
                )}
            </div>
            
            {evaluations.length > 0 && (
                <div className="text-center text-sm text-gray-500 pt-4">
                    انقر على التقييم لعرض التفاصيل الكاملة ودرجات المعايير
                </div>
            )}
        </div>
    );
}
