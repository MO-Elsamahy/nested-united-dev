"use client";

import { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";

interface JournalFormProps {
    onClose: () => void;
    onSuccess: () => void;
    journal?: any;
}

export function JournalForm({ onClose, onSuccess, journal }: JournalFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: journal?.name || "",
        code: journal?.code || "",
        type: journal?.type || "general",
        default_account_id: journal?.default_account_id || ""
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const url = "/api/accounting/journals";
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "فشل الحفظ");
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {journal ? "تعديل يومية" : "إضافة يومية جديدة"}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم اليومية *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                            placeholder="مثلاً: يومية المبيعات"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الكود المختصر *</label>
                        <input
                            type="text"
                            required
                            maxLength={5}
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 uppercase"
                            placeholder="مثلاً: INV"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">النوع *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="sale">مبيعات</option>
                            <option value="purchase">مشتريات</option>
                            <option value="cash">نقدية</option>
                            <option value="bank">بنك</option>
                            <option value="general">عمليات متنوعة</option>
                        </select>
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
                            {loading ? "جاري الحفظ..." : "حفظ اليومية"}
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
