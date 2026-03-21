"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2, Trophy, Search, User, SlidersHorizontal, AlertCircle, Calendar } from "lucide-react";

export default function NewEvaluationPage() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loadingInit, setLoadingInit] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Selection state
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [evalMonth, setEvalMonth] = useState((new Date().getMonth() + 1).toString());
    const [evalYear, setEvalYear] = useState(new Date().getFullYear().toString());
    
    // Template & Config state
    const [templateConfig, setTemplateConfig] = useState<any>(null);
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    
    // Evaluation Form state
    const [notes, setNotes] = useState("");
    const [scores, setScores] = useState<Record<string, { score: number, comment: string }>>({});

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch active employees
                const empRes = await fetch("/api/hr/employees?status=active");
                const empData = await empRes.json();
                setEmployees(Array.isArray(empData) ? empData : []);

                // Fetch all templates (to allow assigning if one doesn't exist)
                const tempRes = await fetch("/api/hr/evaluations/templates");
                const tempData = await tempRes.json();
                setAvailableTemplates(Array.isArray(tempData) ? tempData : []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingInit(false);
            }
        };
        init();
    }, []);

    // When employee is selected, fetch their template config
    useEffect(() => {
        if (!selectedEmployee) {
            setTemplateConfig(null);
            setScores({});
            return;
        }

        const fetchConfig = async () => {
            setLoadingTemplate(true);
            try {
                // First get config
                const res = await fetch(`/api/hr/evaluations/config?employee_id=${selectedEmployee.id}`);
                const configData = await res.json();
                
                if (configData.template_id) {
                    // Fetch full template with criteria
                    const tRes = await fetch(`/api/hr/evaluations/templates/${configData.template_id}`);
                    const templateData = await tRes.json();
                    setTemplateConfig(templateData);
                    
                    // Init scores state
                    const initialScores: Record<string, { score: number, comment: string }> = {};
                    templateData.criteria?.forEach((c: any) => {
                        initialScores[c.id] = { score: c.max_score, comment: "" }; // default to full score
                    });
                    setScores(initialScores);
                } else {
                    setTemplateConfig(null);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoadingTemplate(false);
            }
        };

        fetchConfig();
    }, [selectedEmployee]);

    // Handle assigning a template
    const handleAssignTemplate = async (templateId: string) => {
        if (!selectedEmployee) return;

        setLoadingTemplate(true);
        try {
            const res = await fetch("/api/hr/evaluations/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: selectedEmployee.id, template_id: templateId })
            });
            
            if (res.ok) {
                // Fetch the newly assigned full template
                const tRes = await fetch(`/api/hr/evaluations/templates/${templateId}`);
                const templateData = await tRes.json();
                setTemplateConfig(templateData);
                
                const initialScores: Record<string, { score: number, comment: string }> = {};
                templateData.criteria?.forEach((c: any) => {
                    initialScores[c.id] = { score: c.max_score, comment: "" };
                });
                setScores(initialScores);
            }
        } catch (error) {
            alert("فشل تعيين القالب");
        } finally {
            setLoadingTemplate(false);
        }
    };

    const handleScoreChange = (criterionId: string, value: number, max: number) => {
        // limit valid score
        const bounded = Math.max(0, Math.min(value, max));
        setScores(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], score: bounded } }));
    };

    const handleCommentChange = (criterionId: string, value: string) => {
        setScores(prev => ({ ...prev, [criterionId]: { ...prev[criterionId], comment: value } }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedEmployee || !templateConfig) {
            alert("يرجى اختيار موظف وتعيين قالب تقييم له");
            return;
        }

        setSubmitting(true);
        try {
            // Format scores payload
            const scoresPayload = Object.keys(scores).map(criId => ({
                criterion_id: criId,
                score: scores[criId].score,
                comment: scores[criId].comment
            }));

            const payload = {
                employee_id: selectedEmployee.id,
                template_id: templateConfig.id,
                eval_month: parseInt(evalMonth),
                eval_year: parseInt(evalYear),
                notes,
                scores: scoresPayload
            };

            const res = await fetch("/api/hr/evaluations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            
            if (res.ok) {
                router.push("/hr/evaluations");
                router.refresh();
            } else {
                alert(data.error || "حدث خطأ أثناء حفظ التقييم");
                setSubmitting(false);
            }
        } catch (error) {
            alert("فشل الاتصال");
            setSubmitting(false);
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate live totals
    let currentTotal = 0;
    let maxTotal = 0;
    if (templateConfig?.criteria) {
        templateConfig.criteria.forEach((c: any) => {
            currentTotal += scores[c.id]?.score || 0;
            maxTotal += c.max_score;
        });
    }
    const currentPercentage = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 border-b pb-6">
                <Link href="/hr/evaluations" className="p-2 hover:bg-gray-100 rounded-xl transition">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إجراء تقييم موظف</h1>
                    <p className="text-gray-500">اختر الموظف وقم بتعبئة التقييم الشهري بناءً على المعايير</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Right col: Selection */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-5 h-5 text-violet-600" />
                            الموظف
                        </h3>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="ابحث عن موظف..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 text-sm"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                            {loadingInit ? (
                                <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" /></div>
                            ) : filteredEmployees.map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setSelectedEmployee(emp)}
                                    className={`w-full text-right p-3 rounded-lg border flex items-center gap-3 transition ${
                                        selectedEmployee?.id === emp.id ? "bg-violet-50 border-violet-600 ring-1 ring-violet-600" : "hover:bg-gray-50 border-gray-100"
                                    }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                                        {emp.full_name?.charAt(0)}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-gray-900 text-sm truncate">{emp.full_name}</p>
                                        <p className="text-xs text-gray-500 truncate">{emp.job_title}</p>
                                    </div>
                                </button>
                            ))}
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
                    {!selectedEmployee ? (
                        <div className="bg-white rounded-2xl shadow-sm border h-full flex flex-col items-center justify-center py-20 px-6 text-center">
                            <Trophy className="w-16 h-16 text-gray-200 mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">اختر موظفاً أولاً</h3>
                            <p className="text-gray-500 max-w-sm">يرجى اختيار الموظف من القائمة الجانبية للبدء في نموذج التقييم المخصص له.</p>
                        </div>
                    ) : loadingTemplate ? (
                        <div className="bg-white rounded-2xl shadow-sm border h-64 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                        </div>
                    ) : !templateConfig ? (
                        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-8 text-center h-full flex flex-col items-center justify-center">
                            <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
                            <h3 className="text-xl font-bold text-orange-900 mb-2">الموظف ليس لديه قالب تعيين</h3>
                            <p className="text-orange-700 max-w-md mb-6">لكي تقوم بتقييم {selectedEmployee.full_name}، يرجى تعيين قالب معايير تقييم له ليتم حسابه كل شهر.</p>
                            
                            <div className="w-full max-w-sm mx-auto">
                                <label className="block text-right text-sm font-bold text-orange-900 mb-2">اختر قالب التقييم المناسب للموظف:</label>
                                <select 
                                    className="w-full mb-4 px-4 py-3 rounded-xl border-orange-300 focus:ring-orange-500"
                                    onChange={(e) => {
                                        if(e.target.value) handleAssignTemplate(e.target.value);
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>اختر قالب...</option>
                                    {availableTemplates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <div className="bg-gray-50 border-b p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-xl font-bold text-gray-900">قالب: {templateConfig.name}</h2>
                                    <span className="bg-violet-100 text-violet-800 text-xs font-bold px-3 py-1 rounded-full">
                                        إجمالي الدرجات: {maxTotal}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-sm">{templateConfig.description}</p>
                            </div>

                            <div className="p-6 space-y-8">
                                <div className="space-y-6">
                                    {templateConfig.criteria?.map((c: any) => (
                                        <div key={c.id} className="border rounded-xl p-5 bg-white relative hover:border-violet-300 transition group">
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                    <SlidersHorizontal className="w-4 h-4 text-violet-500" />
                                                    {c.criterion_name}
                                                </h4>
                                                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                                                    <input 
                                                        type="number" 
                                                        required
                                                        min="0"
                                                        max={c.max_score}
                                                        step="0.5"
                                                        className="w-16 bg-transparent text-center font-bold text-lg focus:outline-none text-violet-600"
                                                        value={scores[c.id]?.score ?? c.max_score}
                                                        onChange={(e) => handleScoreChange(c.id, parseFloat(e.target.value), c.max_score)}
                                                    />
                                                    <span className="text-gray-400">/</span>
                                                    <span className="text-gray-600 font-medium">{c.max_score}</span>
                                                </div>
                                            </div>
                                            
                                            {/* Slider visualizer */}
                                            <input 
                                                type="range" 
                                                min="0" 
                                                max={c.max_score} 
                                                step="0.5"
                                                value={scores[c.id]?.score ?? c.max_score}
                                                onChange={(e) => handleScoreChange(c.id, parseFloat(e.target.value), c.max_score)}
                                                className="w-full accent-violet-600 mb-4 cursor-pointer"
                                            />

                                            <input 
                                                type="text"
                                                placeholder="ملاحظات (اختياري)..."
                                                value={scores[c.id]?.comment || ""}
                                                onChange={(e) => handleCommentChange(c.id, e.target.value)}
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
                                            <p className="text-sm text-gray-500">النتيجة النهائية</p>
                                            <p className="font-bold text-xl text-gray-900">{currentTotal} / <span className="text-gray-400 text-lg">{maxTotal}</span></p>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-violet-200 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>اعتماد التقييم</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
