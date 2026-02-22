"use client";

import { useState } from "react";
import { X, AlertCircle } from "lucide-react";

interface CostCenterFormProps {
    onClose: () => void;
    onSuccess: () => void;
    costCenter?: any;
}

export function CostCenterForm({ onClose, onSuccess, costCenter }: CostCenterFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        code: costCenter?.code || "",
        name: costCenter?.name || "",
        description: costCenter?.description || ""
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/accounting/cost-centers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("فشل الحفظ");
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
                        {costCenter ? "تعديل مركز تكلفة" : "إضافة مركز تكلفة"}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الكود *</label>
                        <input type="text" required value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} className="w-full border rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
                        <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">وصف</label>
                        <input type="text" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border rounded-lg p-2" />
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? "جاري..." : "حفظ"}</button>
                        <button type="button" onClick={onClose} className="flex-1 border bg-white text-gray-700 py-2 rounded-lg">إلغاء</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
