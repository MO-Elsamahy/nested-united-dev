"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, User, Trophy, FileText, Download, Loader2, Star } from "lucide-react";
import { useParams } from "next/navigation";

export default function EmployeeViewEvaluationPage() {
    const params = useParams();
    const [evaluation, setEvaluation] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEval = async () => {
            try {
                const res = await fetch(`/api/hr/evaluations/${params.id}`);
                const data = await res.json();
                if (res.ok) {
                    setEvaluation(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchEval();
    }, [params.id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
            </div>
        );
    }

    if (!evaluation) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border">
                <h2 className="text-2xl font-bold text-gray-900">التقييم غير موجود</h2>
                <Link href="/employee/evaluations" className="text-violet-600 hover:underline mt-4 inline-block font-bold">العودة لتقييماتي</Link>
            </div>
        );
    }

    const percentage = parseFloat(evaluation.percentage) || 0;
    
    const getScoreColor = (percentage: number) => {
        if (percentage >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200 ring-emerald-600";
        if (percentage >= 75) return "text-blue-600 bg-blue-50 border-blue-200 ring-blue-600";
        if (percentage >= 60) return "text-yellow-600 bg-yellow-50 border-yellow-200 ring-yellow-600";
        return "text-red-600 bg-red-50 border-red-200 ring-red-600";
    };

    const getScoreLabel = (percentage: number) => {
        if (percentage >= 90) return "ممتاز جداً - أداء استثنائي";
        if (percentage >= 75) return "جيد جداً - أداء متميز";
        if (percentage >= 60) return "جيد - أداء مرضي";
        return "يحتاج إلى تحسين";
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/employee/evaluations" className="p-2 hover:bg-white rounded-xl transition shadow-sm border">
                        <ArrowRight className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">تفاصيل تقييمي الشهري</h1>
                        <p className="text-gray-500">عرض نتائج الأداء والملاحظات الإدارية</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.print()} 
                    className="hidden md:flex items-center justify-center gap-2 bg-white border hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition shadow-sm"
                >
                    <Download className="w-5 h-5" />
                    <span>حفظ كـ PDF</span>
                </button>
            </div>

            {/* Main Score Card */}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden relative">
                <div className={`h-2 w-full ${getScoreColor(percentage).split(' ')[1]}`}></div>
                <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1 text-center md:text-right space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold border border-violet-100">
                                <Trophy className="w-3 h-3" />
                                {new Date(evaluation.eval_year, evaluation.eval_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                            </div>
                            <h2 className="text-3xl font-black text-gray-900">{getScoreLabel(percentage)}</h2>
                            <p className="text-gray-500 max-w-md mx-auto md:mx-0">
                                تم تقييمك بناءً على معايير "{evaluation.template_name}" المعتمدة في القسم.
                                حصيلة نقاطك هي {evaluation.total_score} من إجمالي {evaluation.max_possible_score} نقطة.
                            </p>
                        </div>

                        <div className={`w-40 h-40 md:w-52 md:h-52 rounded-full border-[10px] flex flex-col items-center justify-center ${getScoreColor(percentage)} shadow-inner`}>
                            <span className="text-5xl md:text-6xl font-black font-mono tracking-tighter">{percentage.toFixed(0)}%</span>
                            <div className="flex gap-0.5 mt-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star 
                                        key={star} 
                                        className={`w-4 h-4 ${percentage >= (star * 20) ? 'fill-current' : 'text-gray-200'}`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Criteria */}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        تفصيل الدرجات حسب المعيار
                    </h3>
                </div>
                <div className="divide-y">
                    {evaluation.scores?.map((s: any) => {
                        const sPerc = (parseFloat(s.score) / parseFloat(s.max_score)) * 100;
                        return (
                            <div key={s.id} className="p-6 hover:bg-gray-50/50 transition">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-900 text-lg">{s.criterion_name}</h4>
                                        <p className="text-xs text-gray-500">الحد الأقصى للنقاط: {s.max_score}</p>
                                    </div>
                                    <div className="text-left">
                                        <span className="text-2xl font-black text-violet-600">{s.score}</span>
                                        <span className="text-gray-400 font-bold mx-1">/</span>
                                        <span className="text-gray-400 font-bold">{s.max_score}</span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 rounded-xl h-3 mb-2 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-xl transition-all duration-1000 ${sPerc >= 85 ? 'bg-emerald-500' : sPerc >= 65 ? 'bg-blue-500' : sPerc >= 45 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                        style={{ width: `${sPerc}%` }}
                                    ></div>
                                </div>
                                {s.comment && (
                                    <div className="mt-4 bg-white border border-dashed border-gray-200 p-4 rounded-2xl text-sm text-gray-600 italic">
                                        <span className="font-bold text-gray-900 not-italic block mb-1">ملاحظة المقيم:</span>
                                        "{s.comment}"
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* General Admin Feedback */}
            {evaluation.notes && (
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2 relative z-10">
                        <FileText className="w-6 h-6" />
                        التعليق العام من الإدارة
                    </h3>
                    <p className="text-violet-50 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                        {evaluation.notes}
                    </p>
                </div>
            )}
            
            <style jsx global>{`
                @media print {
                    body { background: white !important; padding: 0 !important; }
                    .max-w-4xl { max-width: 100% !important; }
                    nav, header, footer, button, .shadow-sm, .shadow-xl { display: none !important; }
                    .border { border: 1px solid #eee !important; }
                    .bg-white { background: white !important; }
                    .rounded-3xl { border-radius: 12px !important; }
                }
            `}</style>
        </div>
    );
}
