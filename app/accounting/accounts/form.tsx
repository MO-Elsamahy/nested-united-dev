"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { AccountingAccount } from "@/lib/types/accounting";

interface AccountFormProps {
    onClose: () => void;
    onSuccess: () => void;
    account?: AccountingAccount; // If passed, it's edit mode
}

export function AccountForm({ onClose, onSuccess, account }: AccountFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        code: account?.code || "",
        name: account?.name || "",
        type: account?.type || "expense",
        is_reconcilable: account?.is_reconcilable || false,
        description: account?.description || ""
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const url = "/api/accounting/accounts"; // Typically POST for create
            // For Edit, we would use PUT/PATCH with ID, but keeping it simple for now (Create Only or Edit logic needs API update)

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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "فشل الحفظ");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-900">
                        {account ? "تعديل حساب" : "إضافة حساب جديد"}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كود الحساب *</label>
                        <input
                            type="text"
                            required
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                            placeholder="مثلاً: 101001"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحساب *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                            placeholder="مثلاً: الخزينة الرئيسية"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">النوع *</label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <optgroup label="الأصول">
                                <option value="asset_receivable">مدينون (Receivable)</option>
                                <option value="asset_bank">نقدية وبنوك</option>
                                <option value="asset_current">أصول متداولة أخرى</option>
                                <option value="asset_fixed">أصول ثابتة</option>
                            </optgroup>
                            <optgroup label="الخصوم">
                                <option value="liability_payable">دائنون (Payable)</option>
                                <option value="liability_current">خصوم متداولة</option>
                                <option value="liability_long_term">خصوم طويلة الأجل</option>
                            </optgroup>
                            <optgroup label="حقوق الملكية">
                                <option value="equity">رأس المال والأرباح</option>
                            </optgroup>
                            <optgroup label="الأرباح والخسائر">
                                <option value="income">إيرادات</option>
                                <option value="expense">مصروفات</option>
                                <option value="cost_of_sales">تكلفة مبيعات</option>
                            </optgroup>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="reconcilable"
                            checked={formData.is_reconcilable}
                            onChange={(e) => setFormData({ ...formData, is_reconcilable: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <label htmlFor="reconcilable" className="text-sm text-gray-700">
                            قابل للمطابقة (Reconcilable) - للعملاء والموردين
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">وصف</label>
                        <textarea
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
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
                            {loading ? "جاري الحفظ..." : "حفظ الحساب"}
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
