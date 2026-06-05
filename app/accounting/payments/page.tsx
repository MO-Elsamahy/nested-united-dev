"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Search,
    Trash2,
    BookOpen
} from "lucide-react";
import { useCallback } from "react";
import { useDialog } from "@/components/accounting/DialogProvider";

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

interface JournalMove {
    id: string;
    ref: string;
    narration: string;
    date: string;
    amount_total: number;
    journal_name: string;
    partner_name?: string;
    journal_type: string;
}

type ActiveSection = "payments" | "journal_moves";

export default function PaymentsPage() {
    const { confirm, alert } = useDialog();
    const [activeSection, setActiveSection] = useState<ActiveSection>("payments");
    const [payments, setPayments] = useState<Payment[]>([]);
    const [journalMoves, setJournalMoves] = useState<JournalMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as { role?: string })?.role === "super_admin";

    const fetchPayments = useCallback(async () => {
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
    }, [typeFilter]);

    const fetchJournalMoves = useCallback(async () => {
        try {
            setLoading(true);
            // نجلب القيود من مجلات الخزينة والبنك فقط (type=cash أو type=bank)
            const res = await fetch(`/api/accounting/moves?journal_types=cash,bank`);
            if (res.ok) {
                setJournalMoves(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (activeSection === "payments") {
            void fetchPayments();
        } else {
            void fetchJournalMoves();
        }
    }, [activeSection, fetchPayments, fetchJournalMoves]);

    const handleDelete = async (id: string, number: string) => {
        if (!await confirm(`هل أنت متأكد من حذف السند رقم ${number}؟ سيتم تحديث أرصدة الفواتير المرتبطة به.`)) return;

        const res = await fetch(`/api/accounting/payments/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchPayments();
            await alert("تم حذف السند بنجاح");
        } else {
            const error = await res.json();
            await alert(error.error || "فشل الحذف");
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

    const filteredPayments = payments.filter((p) => {
        const term = normalizeText(searchTerm);
        return (
            normalizeText(p.payment_number).includes(term) ||
            normalizeText(p.partner_name || "").includes(term) ||
            normalizeText(p.invoices || "").includes(term)
        );
    });

    const filteredMoves = journalMoves.filter((m) => {
        const term = normalizeText(searchTerm);
        return (
            normalizeText(m.ref || "").includes(term) ||
            normalizeText(m.narration || "").includes(term) ||
            normalizeText(m.partner_name || "").includes(term) ||
            normalizeText(m.journal_name || "").includes(term)
        );
    });

    // إجماليات السندات
    const totalInbound = payments.filter(p => p.payment_type === 'inbound').reduce((s, p) => s + Number(p.amount), 0);
    const totalOutbound = payments.filter(p => p.payment_type === 'outbound').reduce((s, p) => s + Number(p.amount), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center text-right">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سندات القبض والصرف</h1>
                    <p className="text-gray-600 mt-1">إدارة حركات الخزينة والبنك</p>
                </div>
            </div>

            {/* Stats Summary - تظهر فقط لقسم السندات */}
            {activeSection === "payments" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-gray-500 text-sm mb-1 font-medium">إجمالي المقبوضات</p>
                        <p className="text-2xl font-bold text-green-600">
                            {totalInbound.toLocaleString("ar-SA")} ر.س
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-gray-500 text-sm mb-1 font-medium">إجمالي المدفوعات</p>
                        <p className="text-2xl font-bold text-orange-600">
                            {totalOutbound.toLocaleString("ar-SA")} ر.س
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-gray-500 text-sm mb-1 font-medium">صافي الحركة</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {(totalInbound - totalOutbound).toLocaleString("ar-SA")} ر.س
                        </p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    <button
                        onClick={() => { setActiveSection("payments"); setSearchTerm(""); setTypeFilter(""); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeSection === "payments"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        🧾 سندات القبض والصرف
                    </button>
                    <button
                        onClick={() => { setActiveSection("journal_moves"); setSearchTerm(""); setTypeFilter(""); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition -mb-px flex items-center gap-2 ${activeSection === "journal_moves"
                            ? "border-amber-600 text-amber-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        القيود المباشرة (خزينة/بنك)
                    </button>
                </nav>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={activeSection === "payments"
                            ? "بحث برقم السند، العميل، أو الفاتورة..."
                            : "بحث في القيود المباشرة..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                </div>
                {activeSection === "payments" && (
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        <option value="">كل الأنواع</option>
                        <option value="inbound">سندات قبض</option>
                        <option value="outbound">سندات صرف</option>
                    </select>
                )}
            </div>

            {/* Table - السندات */}
            {activeSection === "payments" && (
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
                                <tr><td colSpan={9} className="p-12 text-center text-gray-400">جاري التحميل...</td></tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr><td colSpan={9} className="p-12 text-center text-gray-400">لا توجد حركات مالية</td></tr>
                            ) : (
                                filteredPayments.map((p) => (
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
                                            <span className={`px-2 py-1 rounded-full text-xs ${p.state === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
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
            )}

            {/* Table - القيود المباشرة */}
            {activeSection === "journal_moves" && (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
                        <p className="text-sm text-amber-800">
                            القيود المباشرة المسجلة على مجلات الخزينة والبنك (خارج سندات القبض والصرف الرسمية)
                        </p>
                    </div>
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b font-medium text-gray-600">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">المرجع</th>
                                <th className="px-6 py-3">المجل</th>
                                <th className="px-6 py-3">الطرف</th>
                                <th className="px-6 py-3">البيان</th>
                                <th className="px-6 py-3">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="p-12 text-center text-gray-400">جاري التحميل...</td></tr>
                            ) : filteredMoves.length === 0 ? (
                                <tr><td colSpan={6} className="p-12 text-center text-gray-400">لا توجد قيود مباشرة</td></tr>
                            ) : (
                                filteredMoves.map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(m.date).toLocaleDateString("ar-SA")}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm">{m.ref || "—"}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${m.journal_type === 'cash' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {m.journal_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{m.partner_name || "—"}</td>
                                        <td className="px-6 py-4 max-w-xs truncate text-gray-500">{m.narration || "—"}</td>
                                        <td className="px-6 py-4 font-bold">
                                            {Number(m.amount_total).toLocaleString("ar-SA")} ر.س
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
