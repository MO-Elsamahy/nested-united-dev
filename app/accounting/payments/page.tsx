"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
    Search, 
    Trash2, 
    DollarSign, 
    Calendar, 
    User, 
    FileText, 
    ArrowUpDown,
    CheckCircle,
    Clock,
    XCircle,
    ChevronDown,
    Filter
} from "lucide-react";

interface Payment {
    id: string;
    payment_number: string;
    payment_type: "inbound" | "outbound";
    partner_name: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    state: string;
    invoices: string;
}

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as any)?.role === "super_admin";

    useEffect(() => {
        fetchPayments();
    }, [typeFilter]);

    async function fetchPayments() {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (typeFilter) params.append("type", typeFilter);

            const res = await fetch(`/api/accounting/payments?${params}`);
            if (res.ok) {
                setPayments(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (id: string, number: string) => {
        if (!confirm(`هل أنت متأكد من حذف السند رقم ${number}؟ سيتم تحديث أرصدة الفواتير المرتبطة به.`)) return;

        const res = await fetch(`/api/accounting/payments/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchPayments();
            alert("تم حذف السند بنجاح");
        } else {
            const error = await res.json();
            alert(error.error || "فشل الحذف");
        }
    };

    const normalizeText = (text: string) => {
        if (!text) return "";
        return text
            .normalize("NFKC")
            .replace(/[أإآ]/g, 'ا')
            .replace(/[ة]/g, 'ه')
            .replace(/[ى]/g, 'ي')
            .replace(/[\u064B-\u065F]/g, '')
            .trim()
            .toLowerCase();
    };

    const filtered = payments.filter((p) => {
        const term = normalizeText(searchTerm);
        return (
            normalizeText(p.payment_number).includes(term) ||
            normalizeText(p.partner_name || "").includes(term) ||
            normalizeText(p.invoices || "").includes(term)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center text-right">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سندات القبض والصرف</h1>
                    <p className="text-gray-600 mt-1">إدارة وحركات النقدية والبنك</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1 font-medium">إجمالي المقبوضات</p>
                    <p className="text-2xl font-bold text-green-600">
                        {payments.filter(p => p.payment_type === 'inbound').reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString("ar-SA")} ر.س
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1 font-medium">إجمالي المدفوعات</p>
                    <p className="text-2xl font-bold text-orange-600">
                        {payments.filter(p => p.payment_type === 'outbound').reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString("ar-SA")} ر.س
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm mb-1 font-medium">صافي الحركة</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {(payments.filter(p => p.payment_type === 'inbound').reduce((sum, p) => sum + Number(p.amount), 0) - 
                          payments.filter(p => p.payment_type === 'outbound').reduce((sum, p) => sum + Number(p.amount), 0)).toLocaleString("ar-SA")} ر.س
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="بحث برقم السند، العميل، أو الفاتورة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">كل الأنواع</option>
                    <option value="inbound">سندات قبض</option>
                    <option value="outbound">سندات صرف</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b font-medium text-gray-600">
                        <tr>
                            <th className="px-6 py-3">رقم السند</th>
                            <th className="px-6 py-3">التاريخ</th>
                            <th className="px-6 py-3">النوع</th>
                            <th className="px-6 py-3">الطرف</th>
                            <th className="px-6 py-3">الفواتير المرتبطة</th>
                            <th className="px-6 py-3">المبلغ</th>
                            <th className="px-6 py-3">الطريقة</th>
                            <th className="px-6 py-3">الحالة</th>
                            <th className="px-6 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="p-12 text-center text-gray-400">جاري التحميل...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="p-12 text-center text-gray-400">لا توجد حركات مالية</td>
                            </tr>
                        ) : (
                            filtered.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono font-medium">{p.payment_number}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(p.payment_date).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-4">
                                        {p.payment_type === "inbound" ? (
                                            <span className="text-green-600 font-medium">قبض</span>
                                        ) : (
                                            <span className="text-orange-600 font-medium">صرف</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">{p.partner_name || "—"}</td>
                                    <td className="px-6 py-4 max-w-xs truncate text-gray-500" title={p.invoices}>
                                        {p.invoices || "—"}
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {Number(p.amount).toLocaleString("ar-SA")} ر.س
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{p.payment_method}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            p.state === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            {p.state === 'posted' ? 'مرحّل' : 'مسودة'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {isSuperAdmin && (
                                                <button
                                                    onClick={() => handleDelete(p.id, p.payment_number)}
                                                    className="p-1.5 hover:bg-red-50 rounded text-red-600 transition"
                                                    title="حذف السند"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
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
