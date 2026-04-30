"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Settings, Loader2, Trash2, Save, X, Pencil } from "lucide-react";
import { EvaluationTemplate } from "@/lib/types/hr";

export default function ManageTemplatesPage() {
    const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [criteria, setCriteria] = useState([{ criterion_name: "", max_score: 10 }]);

    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch("/api/hr/evaluations/templates");
            const data = await res.json();
            setTemplates(Array.isArray(data) ? data : []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleAddCriterion = () => {
        setCriteria([...criteria, { criterion_name: "", max_score: 10 }]);
    };

    const handleRemoveCriterion = (index: number) => {
        setCriteria(criteria.filter((_, i) => i !== index));
    };

    const handleCriterionChange = (index: number, field: string, value: string | number) => {
        const newCriteria = [...criteria];
        newCriteria[index] = { ...newCriteria[index], [field]: value };
        setCriteria(newCriteria);
    };

    const handleEditTemplate = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/evaluations/templates/${id}`);
            if (res.ok) {
                const data = await res.json();
                setName(data.name);
                setDescription(data.description || "");
                setCriteria(data.criteria && data.criteria.length > 0 
                    ? data.criteria 
                    : [{ criterion_name: "", max_score: 10 }]
                );
                setEditingId(id);
                setIsCreating(true); // Reuse the same form container
            } else {
                alert("فشل تحميل بيانات القالب");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الاتصال");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = useCallback(() => {
        setIsCreating(false);
        setEditingId(null);
        setName("");
        setDescription("");
        setCriteria([{ criterion_name: "", max_score: 10 }]);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!name.trim() || criteria.length === 0 || criteria.some(c => !c.criterion_name.trim())) {
            alert("يرجى إدخال اسم القالب والتأكد من عدم ترك أي معيار فارغ");
            return;
        }

        setIsSubmitting(true);
        try {
            const url = editingId 
                ? `/api/hr/evaluations/templates/${editingId}`
                : "/api/hr/evaluations/templates";
            
            const res = await fetch(url, {
                method: editingId ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description, criteria }),
            });

            if (res.ok) {
                resetForm();
                fetchTemplates();
            } else {
                alert("حدث خطأ أثناء الحفظ");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الإتصال");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا القالب؟ (سيتم حذف المعايير المتعلقة به)")) return;

        try {
            const res = await fetch(`/api/hr/evaluations/templates/${id}`, { method: "DELETE" });
            if (res.ok) {
                setTemplates(prev => prev.filter(t => t.id !== id));
            } else {
                alert("قد يكون هناك موظفين أو تقييمات مرتبطة بهذا القالب");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الاتصال");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/hr/evaluations" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5 text-gray-600" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">إدارة قوالب التقييم</h1>
                    <p className="text-gray-500">صمم قوالب مخصصة لمعايير تقييم الموظفين</p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => {
                            resetForm();
                            setIsCreating(true);
                        }}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl transition shadow-lg shadow-violet-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">إنشاء قالب جديد</span>
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8 animate-in slide-in-from-top-4 relative">
                    <button onClick={resetForm} className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900 mb-6">{editingId ? "تعديل قالب التقييم" : "قالب تقييم جديد"}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">اسم القالب</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="مثال: قالب تقييم المبيعات، قالب المدراء..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:bg-white focus:ring-violet-500 transition"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">وصف تنظيمي (اختياري)</label>
                                <input
                                    type="text"
                                    placeholder="وصف مختصر للقسم المستهدف"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border rounded-xl focus:ring-2 focus:bg-white focus:ring-violet-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="block text-sm font-bold text-gray-900">معايير التقييم</label>
                                <button type="button" onClick={handleAddCriterion} className="text-violet-600 text-sm font-bold flex items-center gap-1 hover:underline">
                                    <Plus className="w-4 h-4" /> إضافة معيار
                                </button>
                            </div>
                            
                            <div className="space-y-3">
                                {criteria.map((c, idx) => (
                                    <div key={idx} className="flex gap-3 items-center">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                required
                                                placeholder="اسم المعيار (مثال: الالتزام بالمواعيد)"
                                                value={c.criterion_name}
                                                onChange={(e) => handleCriterionChange(idx, "criterion_name", e.target.value)}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                max="100"
                                                title="أقصى درجة للمعيار"
                                                value={c.max_score}
                                                onChange={(e) => handleCriterionChange(idx, "max_score", parseInt(e.target.value))}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500 text-center"
                                            />
                                        </div>
                                        {criteria.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveCriterion(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold transition"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {editingId ? "تحديث القالب" : "حفظ القالب"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && !isCreating ? (
                    <div className="col-span-full py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : templates.map(template => (
                    <div key={template.id} className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col h-full hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
                                <Settings className="w-6 h-6" />
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEditTemplate(template.id)} className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteTemplate(template.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{template.name}</h3>
                        {template.description && <p className="text-gray-500 text-sm mb-4 line-clamp-2">{template.description}</p>}
                        
                        <div className="mt-auto pt-4 border-t flex justify-between items-center text-sm">
                            <span className="text-gray-500">تم الإنشاء في {new Date(template.created_at).toLocaleDateString("ar-SA")}</span>
                        </div>
                    </div>
                ))}

                {!loading && templates.length === 0 && !isCreating && (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed">
                        <Settings className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">لا يوجد قوالب</h3>
                        <p className="text-gray-500 font-medium">ابدأ بإنشاء أول قالب لتقييم موظفيك</p>
                    </div>
                )}
            </div>
        </div>
    );
}
