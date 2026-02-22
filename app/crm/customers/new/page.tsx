"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Save, Loader2, User, Building2 } from "lucide-react";

export default function NewCustomerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        email: "",
        national_id: "",
        address: "",
        type: "individual",
        notes: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/crm/customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (res.ok) {
                router.push(`/crm/customers/${data.id}`);
                router.refresh();
            } else {
                if (res.status === 409) {
                    alert(`عميل مكرر: ${data.details?.full_name}\nرقم الهاتف: ${data.details?.phone}\n\nهذا العميل مسجل مسبقاً في النظام.`);
                } else {
                    alert(data.error || "حدث خطأ أثناء حفظ البيانات");
                }
                setLoading(false);
            }
        } catch (e) {
            alert("خطأ في الاتصال");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/crm/customers" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إضافة عميل جديد</h1>
                    <p className="text-gray-500">سجل بيانات العميل للبدء في التعامل معه</p>
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
                            placeholder="اسم العميل أو الشركة"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            رقم الهاتف <span className="text-red-500">*</span>
                        </label>
                        <input
                            name="phone"
                            required
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="05xxxxxxxx"
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
                            placeholder="email@example.com"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الهوية الوطنية / السجل التجاري</label>
                        <input
                            name="national_id"
                            value={formData.national_id}
                            onChange={handleChange}
                            placeholder="1234567890"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                        <input
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="المدينة، الشارع..."
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
                            placeholder="أي ملاحظات هامة عن العميل..."
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
                        حفظ العميل
                    </button>
                </div>
            </form>
        </div>
    );
}
