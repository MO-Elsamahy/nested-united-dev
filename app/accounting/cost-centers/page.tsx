"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Target, Trash2 } from "lucide-react";
import { CostCenterForm } from "./form";

export default function CostCentersPage() {
    const [centers, setCenters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => { fetchCenters(); }, []);

    async function fetchCenters() {
        const res = await fetch("/api/accounting/cost-centers");
        if (res.ok) setCenters(await res.json());
        setLoading(false);
    }

    const handleDelete = async (id: string) => {
        if (!confirm("حذف مركز التكلفة؟")) return;
        await fetch(`/api/accounting/cost-centers?id=${id}`, { method: 'DELETE' });
        fetchCenters();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مراكز التكلفة</h1>
                    <p className="text-gray-600">إدارة المشاريع والفروع</p>
                </div>
                <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> <span>مركز جديد</span>
                </button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b font-medium text-gray-600">
                        <tr>
                            <th className="px-6 py-3">الكود</th>
                            <th className="px-6 py-3">الاسم</th>
                            <th className="px-6 py-3">الوصف</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {centers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-gray-500">{c.code}</td>
                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                    <Target className="w-4 h-4 text-blue-500" /> {c.name}
                                </td>
                                <td className="px-6 py-4 text-gray-500">{c.description}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <CostCenterForm onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); fetchCenters(); }} />
            )}
        </div>
    );
}
