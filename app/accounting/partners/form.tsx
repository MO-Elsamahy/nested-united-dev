"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { AccountingPartner } from "@/lib/types/accounting";

interface PartnerFormProps {
    onClose: () => void;
    onSuccess: () => void;
    partner?: AccountingPartner;
}

export function PartnerForm({ onClose, onSuccess, partner }: PartnerFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: partner?.name || "",
        email: partner?.email || "",
        phone: partner?.phone || "",
        type: partner?.type || "customer",
        tax_id: partner?.tax_id || "",
        address: partner?.address || ""
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const url = "/api/accounting/partners";
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("فشل الحفظ");
            }

            onSuccess();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {partner ? "تعديل بيانات الشريك" : "إضافة شريك جديد"}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">النوع *</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountingPartner["type"] })}
                                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="customer">عميل</option>
                                <option value="supplier">مورد</option>
                                <option value="employee">موظف</option>
                                <option value="other">آخر</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الرقم الضريبي</label>
                            <input
                                type="text"
                                value={formData.tax_id}
                                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">البريد</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full border rounded-lg p-2"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                        <textarea
                            rows={2}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full border rounded-lg p-2"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="pt-2 flex gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "جاري الحفظ..." : "حفظ"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 border bg-white text-gray-700 py-2 rounded-lg hover:bg-gray-50"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
