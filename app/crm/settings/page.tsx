"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useDialog } from "@/components/accounting/DialogProvider";

interface CrmTag {
    id: string;
    name: string;
    color: string;
    text_color: string;
}

export default function CRMSettingsPage() {
    const { alert, confirm } = useDialog();
    const [loading, setLoading] = useState(true);
    const [tags, setTags] = useState<CrmTag[]>([]);

    const [newTag, setNewTag] = useState({ name: '', color: 'bg-blue-100', text_color: 'text-blue-700' });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const tagsRes = await fetch('/api/crm/tags');
            const tagsData = await tagsRes.json();
            setTags(Array.isArray(tagsData) ? tagsData : []);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddTag = async () => {
        if (!newTag.name) {
            await alert("يرجى إدخال اسم التصنيف");
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
                await alert('فشل إضافة التصنيف');
            }
        } catch (error: unknown) {
            await alert(error instanceof Error ? error.message : 'حدث خطأ');
        }
    };

    const handleDeleteTag = async (id: string) => {
        if (!await confirm('هل أنت متأكد من حذف هذا التصنيف؟')) return;

        try {
            await fetch(`/api/crm/tags?id=${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error: unknown) {
            await alert(error instanceof Error ? error.message : 'حدث خطأ');
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

            {/* Tags Section */}
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
        </div>
    );
}
