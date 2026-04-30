
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Send, Loader2 } from "lucide-react";

export default function NewRequestPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        request_type: "annual_leave",
        start_date: "",
        end_date: "",
        reason: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/hr/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/employee/requests");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "حدث خطأ");
            }
        } catch (_error) {
            alert("حدث خطأ في الاتصال");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/employee/requests" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تقديم طلب جديد</h1>
                    <p className="text-gray-500">إجازة، إذن، أو طلب آخر</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطلب</label>
                    <select
                        required
                        className="w-full px-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                        value={formData.request_type}
                        onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                    >
                        <option value="annual_leave">إجازة سنوية</option>
                        <option value="sick_leave">إجازة مرضية</option>
                        <option value="unpaid_leave">إجازة بدون راتب</option>
                        <option value="shift_swap">تبديل شيفت</option>
                        <option value="overtime">عمل إضافي</option>
                        <option value="other">أخرى</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                        <p className="text-xs text-gray-400 mt-1">اتركه فارغاً إذا كان يوماً واحداً</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السبب / التفاصيل</label>
                    <textarea
                        required
                        rows={4}
                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="يرجى توضيح سبب الطلب..."
                    />
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-violet-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-violet-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>إرسال الطلب</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
