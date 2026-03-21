"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2, DollarSign, Calendar, AlertTriangle } from "lucide-react";

function NewDealForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedCustomerId = searchParams.get("customer_id");

    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        customer_id: preSelectedCustomerId || "",
        title: "",
        value: "",
        stage: "new",
        priority: "medium",
        expected_close_date: "",
        notes: ""
    });

    useEffect(() => {
        // Fetch customers for dropdown
        fetch("/api/crm/customers")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setCustomers(data);
            });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/crm/deals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                router.push("/crm/deals");
                router.refresh();
            } else {
                alert("Error saving deal");
                setLoading(false);
            }
        } catch (e) {
            alert("Connection error");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">العميل <span className="text-red-500">*</span></label>
                    <select
                        name="customer_id"
                        required
                        value={formData.customer_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={!!preSelectedCustomerId}
                    >
                        <option value="">اختر العميل...</option>
                        {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الصفقة <span className="text-red-500">*</span></label>
                    <input
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="مثال: إيجار فيلا لمدة شهر"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>



                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الإغلاق المتوقع</label>
                    <input
                        type="date"
                        name="expected_close_date"
                        value={formData.expected_close_date}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الأولوية</label>
                    <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                    >
                        <option value="low">منخفضة</option>
                        <option value="medium">متوسطة</option>
                        <option value="high">عالية</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المرحلة</label>
                    <select
                        name="stage"
                        value={formData.stage}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg bg-white"
                    >
                        <option value="new">جديد</option>
                        <option value="contacting">جاري التواصل</option>
                        <option value="proposal">إرسال عرض</option>
                        <option value="negotiation">تفاوض</option>
                        <option value="won">تم الاتفاق</option>
                        <option value="lost">خسارة</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                    name="notes"
                    rows={4}
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                ></textarea>
            </div>

            <div className="pt-4 border-t flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                    إلغاء
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ الصفقة
                </button>
            </div>
        </form>
    );
}

export default function NewDealPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/crm/deals" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إضافة صفقة جديدة</h1>
                    <p className="text-gray-500">إنشاء فرصة بيعية جديدة في الـ Pipeline</p>
                </div>
            </div>

            <Suspense fallback={<div className="text-center p-8">جاري التحميل...</div>}>
                <NewDealForm />
            </Suspense>
        </div>
    );
}
