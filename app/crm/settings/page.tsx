"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2, Tag, Layers } from "lucide-react";

interface Stage {
    id: string;
    label: string;
    stage_key: string;
    color: string;
    stage_order: number;
}

interface CRMTag {
    id: string;
    name: string;
    color: string;
    text_color: string;
}

export default function CRMSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [stages, setStages] = useState<Stage[]>([]);
    const [tags, setTags] = useState<CRMTag[]>([]);
    const [activeTab, setActiveTab] = useState<'stages' | 'tags'>('stages');

    // New Stage Form
    const [newStage, setNewStage] = useState({ label: '', stage_key: '', color: 'bg-gray-100' });
    const [newTag, setNewTag] = useState({ name: '', color: 'bg-blue-100', text_color: 'text-blue-700' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stagesRes, tagsRes] = await Promise.all([
                fetch('/api/crm/stages'),
                fetch('/api/crm/tags')
            ]);
            const stagesData = await stagesRes.json();
            const tagsData = await tagsRes.json();
            setStages(Array.isArray(stagesData) ? stagesData : []);
            setTags(Array.isArray(tagsData) ? tagsData : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStage = async () => {
        if (!newStage.label || !newStage.stage_key) {
            alert("يرجى إدخال الاسم والمعرف");
            return;
        }

        try {
            const res = await fetch('/api/crm/stages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newStage, stage_order: stages.length + 1 })
            });

            if (res.ok) {
                setNewStage({ label: '', stage_key: '', color: 'bg-gray-100' });
                fetchData();
            } else {
                alert('فشل إضافة المرحلة');
            }
        } catch (e) {
            alert('حدث خطأ');
        }
    };

    const handleDeleteStage = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المرحلة؟')) return;

        try {
            await fetch(`/api/crm/stages?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (e) {
            alert('حدث خطأ');
        }
    };

    const handleAddTag = async () => {
        if (!newTag.name) {
            alert("يرجى إدخال اسم التصنيف");
            return;
        }

        try {
            const res = await fetch('/api/crm/tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTag)
            });

            if (res.ok) {
                setNewTag({ name: '', color: 'bg-blue-100', text_color: 'text-blue-700' });
                fetchData();
            } else {
                alert('فشل إضافة التصنيف');
            }
        } catch (e) {
            alert('حدث خطأ');
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

        try {
            await fetch(`/api/crm/tags?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (e) {
            alert('حدث خطأ');
        }
    };

    const colorOptions = [
        { bg: 'bg-gray-100', text: 'text-gray-700', label: 'رمادي' },
        { bg: 'bg-blue-100', text: 'text-blue-700', label: 'أزرق' },
        { bg: 'bg-purple-100', text: 'text-purple-700', label: 'بنفسجي' },
        { bg: 'bg-green-100', text: 'text-green-700', label: 'أخضر' },
        { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'أصفر' },
        { bg: 'bg-red-100', text: 'text-red-700', label: 'أحمر' },
        { bg: 'bg-amber-100', text: 'text-amber-700', label: 'عنبري' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">إعدادات CRM</h1>
                <p className="text-gray-500">إدارة متقدمة لنظام العملاء</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
                <button
                    onClick={() => setActiveTab('stages')}
                    className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'stages'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    مراحل الصفقات
                </button>
                <button
                    onClick={() => setActiveTab('tags')}
                    className={`px-4 py-2 font-medium transition flex items-center gap-2 ${activeTab === 'tags'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Tag className="w-4 h-4" />
                    تصنيفات العملاء
                </button>
            </div>

            {/* Stages Tab */}
            {activeTab === 'stages' && (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                        أعمدة لوحة الصفقات (Pipeline) ثابتة في الواجهة حالياً ومطابقة لمراحل النظام. يمكنك هنا
                        حفظ مراحل إضافية للتقارير والتوسعة لاحقاً.
                    </p>
                    {/* Add New Stage */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            إضافة مرحلة جديدة
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                placeholder="اسم المرحلة (مثلاً: مرحلة التفاوض)"
                                value={newStage.label}
                                onChange={(e) => setNewStage({ ...newStage, label: e.target.value })}
                                className="px-4 py-2 border rounded-lg"
                            />
                            <input
                                placeholder="المعرف (stage_key)"
                                value={newStage.stage_key}
                                onChange={(e) => setNewStage({ ...newStage, stage_key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                                className="px-4 py-2 border rounded-lg"
                            />
                            <select
                                value={newStage.color}
                                onChange={(e) => setNewStage({ ...newStage, color: e.target.value })}
                                className="px-4 py-2 border rounded-lg bg-white"
                            >
                                {colorOptions.map((c) => (
                                    <option key={c.bg} value={c.bg}>{c.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddStage}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
                            >
                                إضافة
                            </button>
                        </div>
                    </div>

                    {/* Existing Stages */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-gray-900 mb-4">المراحل الحالية</h3>
                        <div className="space-y-2">
                            {stages.map((stage) => (
                                <div
                                    key={stage.id}
                                    className={`p-4 rounded-lg border flex items-center justify-between ${stage.color}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                                            {stage.stage_order}
                                        </span>
                                        <div>
                                            <span className="font-medium text-gray-900 block">{stage.label}</span>
                                            <span className="text-xs text-gray-500">{stage.stage_key}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteStage(stage.id)}
                                        className="p-2 hover:bg-white rounded-lg transition text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tags Tab */}
            {activeTab === 'tags' && (
                <div className="space-y-6">
                    {/* Add New Tag */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-600" />
                            إضافة تصنيف جديد
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                placeholder="اسم التصنيف (مثلاً: عميل VIP)"
                                value={newTag.name}
                                onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                className="px-4 py-2 border rounded-lg"
                            />
                            <select
                                value={newTag.color}
                                onChange={(e) => {
                                    const selected = colorOptions.find(c => c.bg === e.target.value);
                                    setNewTag({ ...newTag, color: e.target.value, text_color: selected?.text || 'text-gray-700' });
                                }}
                                className="px-4 py-2 border rounded-lg bg-white"
                            >
                                {colorOptions.map((c) => (
                                    <option key={c.bg} value={c.bg}>{c.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddTag}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition md:col-span-2"
                            >
                                إضافة التصنيف
                            </button>
                        </div>
                    </div>

                    {/* Existing Tags */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="font-bold text-gray-900 mb-4">التصنيفات الحالية</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {tags.map((tag) => (
                                <div
                                    key={tag.id}
                                    className={`p-4 rounded-lg border flex items-center justify-between ${tag.color}`}
                                >
                                    <span className={`font-medium ${tag.text_color}`}>{tag.name}</span>
                                    <button
                                        onClick={() => handleDeleteTag(tag.id)}
                                        className="p-1 hover:bg-white rounded transition text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
