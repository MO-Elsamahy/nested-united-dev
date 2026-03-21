"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Calendar, User, Trophy, FileText, Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

export default function ViewEvaluationPage() {
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
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-gray-900">التقييم غير موجود</h2>
                <Link href="/hr/evaluations" className="text-violet-600 hover:underline mt-4 inline-block">العودة للتقييمات</Link>
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

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/hr/evaluations" className="p-2 hover:bg-gray-100 rounded-xl transition">
                        <ArrowRight className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">نتيجة التقييم الشهري</h1>
                        <p className="text-gray-500">تقييم الأداء المفصل للموظف</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.print()} 
                    className="flex items-center justify-center gap-2 bg-white border hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl transition"
                >
                    <Download className="w-5 h-5" />
                    <span>طباعة</span>
                </button>
            </div>

            {/* Header / Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center print-card">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex flex-shrink-0 items-center justify-center font-bold text-gray-600 text-xl">
                            {evaluation.employee_name?.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{evaluation.employee_name}</h2>
                            <p className="text-gray-500">{evaluation.department} - {evaluation.job_title}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4"/> الشهر المراد تقييمه</label>
                            <p className="font-bold text-gray-900">{new Date(evaluation.eval_year, evaluation.eval_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mb-1"><FileText className="w-4 h-4"/> قالب التقييم</label>
                            <p className="font-bold text-gray-900">{evaluation.template_name}</p>
                        </div>
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mb-1"><User className="w-4 h-4"/> تم التقييم بواسطة</label>
                            <p className="font-bold text-gray-900">{evaluation.evaluator_name || 'الإدارة'} <span className="text-gray-400 font-normal text-sm">في {new Date(evaluation.created_at).toLocaleDateString("ar-SA")}</span></p>
                        </div>
                    </div>
                </div>
                
                {/* Score Circle */}
                <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full border-8 flex flex-col flex-shrink-0 items-center justify-center ${getScoreColor(percentage)} mx-auto`}>
                    <span className="text-4xl md:text-5xl font-black font-mono">{percentage.toFixed(0)}%</span>
                    <span className="text-sm font-medium mt-1">{evaluation.total_score} من {evaluation.max_possible_score}</span>
                </div>
            </div>

            {/* Criteria Breakdown */}
            <h3 className="text-lg font-bold text-gray-900 mt-8 mb-4 px-2">تفاصيل المعايير والنقاط</h3>
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden print-card">
                <div className="divide-y">
                    {evaluation.scores?.map((s: any) => {
                        const sPerc = (parseFloat(s.score) / parseFloat(s.max_score)) * 100;
                        return (
                            <div key={s.id} className="p-5 hover:bg-gray-50 transition">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                    <h4 className="font-bold text-gray-900">{s.criterion_name}</h4>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-lg font-bold text-violet-600">{s.score} <span className="text-gray-400 text-sm font-medium">/ {s.max_score}</span></span>
                                    </div>
                                </div>
                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                                    <div 
                                        className={`h-2 rounded-full ${sPerc >= 80 ? 'bg-emerald-500' : sPerc >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                        style={{ width: `${sPerc}%` }}
                                    ></div>
                                </div>
                                {s.comment && (
                                    <p className="text-sm text-gray-600 bg-gray-50 border p-3 rounded-lg mt-2">
                                        <span className="font-bold text-gray-900">ملاحظة: </span>
                                        {s.comment}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* General Notes */}
            {evaluation.notes && (
                <div className="bg-white rounded-2xl shadow-sm border p-6 print-card">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-violet-600" />
                        ملاحظات التقييم العامة
                    </h3>
                    <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">{evaluation.notes}</p>
                </div>
            )}
            
            <style jsx global>{`
                @media print {
                    body { background: white; }
                    .print-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; break-inside: avoid; }
                    button, a { display: none !important; }
                }
            `}</style>
        </div>
    );
}
