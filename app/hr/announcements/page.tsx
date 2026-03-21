
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Megaphone, Plus, Pin, Trash2, Calendar, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        priority: "normal",
        is_pinned: false,
        expires_at: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hr/announcements");
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch("/api/hr/announcements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setShowForm(false);
                setFormData({ title: "", content: "", priority: "normal", is_pinned: false, expires_at: "" });
                fetchAnnouncements();
            } else {
                alert("حدث خطأ");
            }
        } catch (error) {
            alert("فشل الاتصال");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الإعلانات والتعاميم</h1>
                    <p className="text-gray-500">نشر الأخبار والتنبيهات للموظفين</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>إعلان جديد</span>
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <div className="bg-white rounded-xl shadow-lg border p-6 animate-in slide-in-from-top-4">
                    <h3 className="font-bold text-lg mb-4">إنشاء إعلان جديد</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border rounded-xl"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="مثال: إجازة عيد الفطر المبارك"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">المحتوى</label>
                            <textarea
                                required
                                rows={4}
                                className="w-full px-4 py-2 border rounded-xl"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="نص الإعلان..."
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                >
                                    <option value="normal">عادي</option>
                                    <option value="high">مهم</option>
                                    <option value="urgent">عاجل</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء (اختياري)</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border rounded-xl"
                                    value={formData.expires_at}
                                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center h-full pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 rounded text-violet-600"
                                        checked={formData.is_pinned}
                                        onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                                    />
                                    <span className="text-gray-700 font-medium select-none">تثبيت في الأعلى</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="bg-violet-600 text-white px-6 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                            >
                                {submitting ? "جاري النشر..." : "نشر الإعلان"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
                ) : announcements.length > 0 ? (
                    announcements.map((ann) => (
                        <div key={ann.id} className={`bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${ann.priority === 'urgent' ? 'border-red-200 bg-red-50' :
                                ann.priority === 'high' ? 'border-orange-200 bg-orange-50' : ''
                            }`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {ann.is_pinned && <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><Pin className="w-3 h-3" /> مثبت</span>}
                                    {ann.priority === 'urgent' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">عاجل</span>}
                                    <span className="text-gray-400 text-sm flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(ann.published_at).toLocaleDateString("ar-SA")}
                                    </span>
                                </div>
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{ann.title}</h3>
                                <p className="text-gray-600">{ann.content}</p>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span>بواسطة: {ann.created_by_name || "النظام"}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed">
                        <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-500">لا توجد إعلانات منشورة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
