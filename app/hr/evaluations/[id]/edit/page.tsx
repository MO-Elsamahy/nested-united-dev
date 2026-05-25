"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2, Trophy, SlidersHorizontal, Calendar, FileText } from "lucide-react";
import { useSession } from "next-auth/react";

interface EvaluationScoreDetail {
    id: string;
    criterion_id: string;
    criterion_name: string;
    max_score: number;
    score: number;
    comment: string | null;
}

interface EvaluationDetail {
    id: string;
    employee_id: string;
    employee_name: string;
    department?: string;
    job_title?: string;
    template_id: string;
    template_name: string;
    eval_month: number;
    eval_year: number;
    notes?: string | null;
    scores?: EvaluationScoreDetail[];
}

export default function EditEvaluationPage() {
    const router = useRouter();
    const params = useParams();
    const { data: session } = useSession();
    
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Evaluation Form state
    const [evaluation, setEvaluation] = useState<EvaluationDetail | null>(null);
    const [evalMonth, setEvalMonth] = useState("");
    const [evalYear, setEvalYear] = useState("");
    const [notes, setNotes] = useState("");
    const [scores, setScores] = useState<Record<string, { score: number, comment: string }>>({});

    const userRole = session?.user ? (session.user as { role?: string }).role : "";
    const canEdit = ["super_admin", "admin", "hr_manager"].includes(userRole || "");

    useEffect(() => {
        const fetchEval = async () => {
            try {
                const res = await fetch(`/api/hr/evaluations/${params.id}`);
                const data = (await res.json()) as EvaluationDetail;
                if (res.ok) {
                    setEvaluation(data);
                    setEvalMonth(data.eval_month.toString());
                    setEvalYear(data.eval_year.toString());
                    setNotes(data.notes || "");
                    
                    const initialScores: Record<string, { score: number, comment: string }> = {};
                    data.scores?.forEach((s) => {
                        initialScores[s.criterion_id] = { score: s.score, comment: s.comment || "" };
                    });
                    setScores(initialScores);
                } else {
                    alert("التقييم غير موجود");
                    router.push("/hr/evaluations");
                }
            } catch (error) {
                console.error(error);
                alert("حدث خطأ أثناء تحميل البيانات");
            } finally {
                setLoading(false);
            }
        };
        fetchEval();
    }, [params.id, router]);

    const handleScoreChange = (criterionId: string, value: number, max: number) => {
        const bounded = Math.max(0, Math.min(value, max));
        setScores(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], score: bounded } }));
    };

    const handleCommentChange = (criterionId: string, value: string) => {
        setScores(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], comment: value } }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!evaluation) return;

        setSubmitting(true);
        try {
            const scoresPayload = Object.keys(scores).map(criId => ({
                criterion_id: criId,
                score: scores[criId].score.toString(),
                comment: scores[criId].comment
            }));

            const payload = {
                eval_month: parseInt(evalMonth),
                eval_year: parseInt(evalYear),
                notes,
                scores: scoresPayload
            };

            const res = await fetch(`/api/hr/evaluations/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            
            if (res.ok) {
                router.push(`/hr/evaluations/${params.id}`);
                router.refresh();
            } else {
                alert(data.error || "حدث خطأ أثناء تعديل التقييم");
                setSubmitting(false);
            }
        } catch (error) {
            alert("فشل الاتصال بالخادم");
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600" />
            </div>
        );
    }

    if (!canEdit) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-red-600">غير مصرح لك بتعديل التقييمات</h2>
                <Link href={`/hr/evaluations/${params.id}`} className="text-violet-600 hover:underline mt-4 inline-block">العودة لتفاصيل التقييم</Link>
            </div>
        );
    }

    if (!evaluation) return null;

    // Calculate live totals
    let currentTotal = 0;
    let maxTotal = 0;
    evaluation.scores?.forEach((s) => {
        currentTotal += scores[s.criterion_id]?.score ?? 0;
        maxTotal += Number(s.max_score);
    });
    const currentPercentage = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
                <Link href={`/hr/evaluations/${params.id}`} className="p-2 hover:bg-gray-100 rounded-xl transition">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تعديل التقييم الشهري</h1>
                    <p className="text-gray-500">تعديل درجات وملاحظات التقييم لـ {evaluation.employee_name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Right col: Static Info */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-violet-600" />
                            الموظف المقيّم
                        </h3>
                        <div className="p-4 bg-gray-50 rounded-xl border">
                            <h4 className="font-bold text-gray-950 text-base">{evaluation.employee_name}</h4>
                            <p className="text-sm text-gray-500 mt-1">{evaluation.department} - {evaluation.job_title}</p>
                            <p className="text-xs text-gray-400 mt-2">القالب: {evaluation.template_name}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-violet-600" />
                            فترة التقييم
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">الشهر</label>
                                <select 
                                    value={evalMonth} 
                                    onChange={(e) => setEvalMonth(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('ar-SA', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">السنة</label>
                                <select 
                                    value={evalYear} 
                                    onChange={(e) => setEvalYear(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                >
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left col: Form */}
                <div className="md:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                        <div className="bg-gray-50 border-b p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">تعديل معايير النقاط</h2>
                                <span className="bg-violet-100 text-violet-800 text-xs font-bold px-3 py-1 rounded-full">
                                    إجمالي الدرجات: {maxTotal}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 space-y-8">
                            <div className="space-y-6">
                                {evaluation.scores?.map((s) => (
                                    <div key={s.id} className="border rounded-xl p-5 bg-white relative hover:border-violet-300 transition group">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                <SlidersHorizontal className="w-4 h-4 text-violet-500" />
                                                {s.criterion_name}
                                            </h4>
                                            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                <input 
                                                    type="number" 
                                                    required
                                                    min="0"
                                                    max={s.max_score}
                                                    step="0.5"
                                                    className="w-16 bg-transparent text-center font-bold text-lg focus:outline-none text-violet-600"
                                                    value={scores[s.criterion_id]?.score ?? s.score}
                                                    onChange={(e) => handleScoreChange(s.criterion_id, parseFloat(e.target.value), s.max_score)}
                                                />
                                                <span className="text-gray-400">/</span>
                                                <span className="text-gray-600 font-medium">{s.max_score}</span>
                                            </div>
                                        </div>
                                        
                                        {/* Slider visualizer */}
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max={s.max_score} 
                                            step="0.5"
                                            value={scores[s.criterion_id]?.score ?? s.score}
                                            onChange={(e) => handleScoreChange(s.criterion_id, parseFloat(e.target.value), s.max_score)}
                                            className="w-full accent-violet-600 mb-4 cursor-pointer"
                                        />

                                        <input 
                                            type="text"
                                            placeholder="ملاحظات (اختياري)..."
                                            value={scores[s.criterion_id]?.comment || ""}
                                            onChange={(e) => handleCommentChange(s.criterion_id, e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-violet-500 text-sm transition"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-900 mb-2">ملاحظات التقييم العامة</label>
                                <textarea
                                    rows={4}
                                    placeholder="نقاط القوة، نقاط الضعف، والتوصيات العامة..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-violet-500 resize-none"
                                ></textarea>
                            </div>

                            <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-violet-100 border-4 flex items-center justify-center border-violet-200">
                                        <span className="font-bold text-violet-600 font-mono">{currentPercentage.toFixed(0)}%</span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">النتيجة النهائية الجديدة</p>
                                        <p className="font-bold text-xl text-gray-900">{currentTotal} / <span className="text-gray-400 text-lg">{maxTotal}</span></p>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                    <Link
                                        href={`/hr/evaluations/${params.id}`}
                                        className="flex-1 sm:flex-initial text-center bg-white border hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl transition"
                                    >
                                        إلغاء
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-violet-200 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>حفظ التعديلات</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
