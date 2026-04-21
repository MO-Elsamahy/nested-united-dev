"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import type { CustomerDetailResponse } from "@/lib/types/crm";

export default function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loadingPage, setLoadingPage] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        email: "",
        national_id: "",
        address: "",
        type: "individual",
        notes: "",
        status: "active",
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/crm/customers/${id}`);
                const json: CustomerDetailResponse | { error?: string } = await res.json();
                if (!res.ok || !("customer" in json) || cancelled) {
                    router.replace("/crm/customers");
                    return;
                }
                const c = json.customer;
                setFormData({
                    full_name: c.full_name ?? "",
                    phone: c.phone ?? "",
                    email: c.email ?? "",
                    national_id: c.national_id ?? "",
                    address: c.address ?? "",
                    type: c.type || "individual",
                    notes: c.notes ?? "",
                    status: c.status || "active",
                });
            } catch {
                router.replace("/crm/customers");
            } finally {
                if (!cancelled) setLoadingPage(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/customers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                router.push(`/crm/customers/${id}`);
                router.refresh();
            } else {
                alert((data as { error?: string }).error || "تعذّر حفظ التعديلات");
                setLoading(false);
            }
        } catch {
            alert("خطأ في الاتصال");
            setLoading(false);
        }
    };

    if (loadingPage) {
        return (
            <div className="max-w-3xl mx-auto p-12 text-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
                جاري التحميل...
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href={`/crm/customers/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">تعديل بيانات العميل</h1>
                    <p className="text-gray-500">تحديث معلومات الاتصال والملاحظات</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            الاسم الكامل <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="full_name"
                            required
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نوع العميل</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="individual">فرد</option>
                            <option value="company">شركة</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الحالة</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                            <option value="archived">مؤرشف</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            رقم الهاتف <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="phone"
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الهوية الوطنية / السجل التجاري</label>
                        <input
                            name="national_id"
                            value={formData.national_id}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                        <input
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                        <textarea
                            name="notes"
                            rows={4}
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
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
                        حفظ التعديلات
                    </button>
                </div>
            </form>
        </div>
    );
}
