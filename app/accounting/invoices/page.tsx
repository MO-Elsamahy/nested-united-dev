"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Eye, Edit, Trash2, Check, X } from "lucide-react";

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    partner_name: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    state: "draft" | "confirmed" | "paid" | "partial" | "cancelled";
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [stateFilter, setStateFilter] = useState("");

    useEffect(() => {
        fetchInvoices();
    }, [stateFilter]);

    async function fetchInvoices() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (stateFilter) params.append("state", stateFilter);

            const res = await fetch(`/api/accounting/invoices?${params}`);
            if (res.ok) {
                setInvoices(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) return;

        const res = await fetch(`/api/accounting/invoices/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchInvoices();
        } else {
            const error = await res.json();
            alert(error.error || "فشل الحذف");
        }
    };

    // Arabic character normalization for better search results
    const normalizeText = (text: string) => {
        if (!text) return "";
        return text
            .normalize("NFKC") // Normalize unicode characters
            .replace(/[أإآ]/g, 'ا') // Normalize Alef
            .replace(/[ة]/g, 'ه')   // Normalize Ta Marbuta
            .replace(/[ى]/g, 'ي')   // Normalize Ya
            .replace(/[\u064B-\u065F]/g, '') // Remove Tashkeel (diacritics)
            .trim()
            .toLowerCase();
    };

    const filtered = invoices.filter((inv) => {
        const term = normalizeText(searchTerm);
        return (
            normalizeText(inv.invoice_number).includes(term) ||
            normalizeText(inv.partner_name || "").includes(term)
        );
    });

    const getStateBadge = (state: string) => {
        const badges: Record<string, { color: string; text: string; icon: any }> = {
            draft: { color: "bg-gray-100 text-gray-700", text: "مسودة", icon: FileText },
            confirmed: { color: "bg-blue-100 text-blue-700", text: "مؤكدة", icon: Check },
            partial: { color: "bg-yellow-100 text-yellow-700", text: "دفع جزئي", icon: FileText },
            paid: { color: "bg-green-100 text-green-700", text: "مدفوعة", icon: Check },
            cancelled: { color: "bg-red-100 text-red-700", text: "ملغاة", icon: X },
        };
        const badge = badges[state] || badges.draft;
        const Icon = badge.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                <Icon className="w-3 h-3" />
                {badge.text}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">فواتير المبيعات</h1>
                    <p className="text-gray-600 mt-1">إدارة الفواتير والمبيعات</p>
                </div>
                <Link
                    href="/accounting/invoices/new"
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    <span>فاتورة جديدة</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث برقم الفاتورة أو اسم العميل..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">كل الحالات</option>
                    <option value="draft">مسودة</option>
                    <option value="confirmed">مؤكدة</option>
                    <option value="partial">دفع جزئي</option>
                    <option value="paid">مدفوعة</option>
                    <option value="cancelled">ملغاة</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b font-medium text-gray-600">
                        <tr>
                            <th className="px-6 py-3">رقم الفاتورة</th>
                            <th className="px-6 py-3">العميل</th>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">تاريخ الاستحقاق</th>
                            <th className="px-6 py-3">المبلغ الإجمالي</th>
                            <th className="px-6 py-3">المتبقي</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-400">جاري التحميل...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-gray-400">لا توجد فواتير</td>
                            </tr>
                        ) : (
                            filtered.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-blue-600">
                                        <Link href={`/accounting/invoices/${invoice.id}`} className="hover:underline">
                                            {invoice.invoice_number}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">{invoice.partner_name}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(invoice.due_date).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-4 font-medium">
                                        {Number(invoice.total_amount).toLocaleString("ar-SA")} ر.س
                                    </td>
                                    <td className="px-6 py-4 font-medium text-red-600">
                                        {Number(invoice.amount_due).toLocaleString("ar-SA")} ر.س
                                    </td>
                                    <td className="px-6 py-4">{getStateBadge(invoice.state)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/accounting/invoices/${invoice.id}`}
                                                className="p-1 hover:bg-blue-50 rounded text-blue-600"
                                                title="عرض"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            {invoice.state === "draft" && (
                                                <>
                                                    <Link
                                                        href={`/accounting/invoices/${invoice.id}/edit`}
                                                        className="p-1 hover:bg-yellow-50 rounded text-yellow-600"
                                                        title="تعديل"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(invoice.id)}
                                                        className="p-1 hover:bg-red-50 rounded text-red-600"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
