"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Users, Phone, Trash2, Edit } from "lucide-react";
import { PartnerForm } from "./form";

interface Partner {
    id: string;
    name: string;
    type: string;
    phone: string;
    email: string;
}

export default function PartnersPage() {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        fetchPartners();
    }, []);

    async function fetchPartners() {
        try {
            setLoading(true);
            const res = await fetch("/api/accounting/partners");
            if (res.ok) setPartners(await res.json());
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("حذف هذا الشريك؟")) return;
        await fetch(`/api/accounting/partners?id=${id}`, { method: 'DELETE' });
        fetchPartners();
    };

    const filtered = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'customer': return 'عميل';
            case 'supplier': return 'مورد';
            case 'employee': return 'موظف';
            default: return 'آخر';
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الشركاء (العملاء والموردين)</h1>
                    <p className="text-gray-600">إدارة جهات التعامل المالي</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>شريك جديد</span>
                </button>
            </div>

            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="بحث بالاسم..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b font-medium text-gray-600">
                        <tr>
                            <th className="px-6 py-3">الاسم</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">معلومات الاتصال</th>
                            <th className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map(p => (
                            <tr key={p.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    {p.name}
                                </td>
                                <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{getTypeLabel(p.type)}</span></td>
                                <td className="px-6 py-4 text-gray-500">
                                    {p.phone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.phone}</div>}
                                    {p.email && <div className="text-xs">{p.email}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">لا يوجد شركاء</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <PartnerForm
                    onClose={() => setShowForm(false)}
                    onSuccess={() => { setShowForm(false); fetchPartners(); }}
                />
            )}
        </div>
    );
}
