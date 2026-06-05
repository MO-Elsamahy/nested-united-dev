"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Search, FileText, Eye, Edit, Trash2, Check, X } from "lucide-react";
import { useCallback } from "react";
import { useDialog } from "@/components/accounting/DialogProvider";

interface Invoice {
    id: string;
    invoice_number: string;
    invoice_type: string;
    partner_name: string;
    invoice_date: string;
    due_date?: string | null;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    state: "draft" | "confirmed" | "paid" | "partial" | "cancelled";
}

type InvoiceTab = "customer_invoice" | "vendor_bill";

export default function InvoicesPage() {
    const { alert, confirm, prompt } = useDialog();
    const [activeTab, setActiveTab] = useState<InvoiceTab>("customer_invoice");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [stateFilter, setStateFilter] = useState("");
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as { role?: string })?.role === "super_admin";

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append("type", activeTab);
            if (stateFilter) params.append("state", stateFilter);

            const res = await fetch(`/api/accounting/invoices?${params}`);
            if (res.ok) {
                setInvoices(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, [stateFilter, activeTab]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleDelete = async (id: string, isDraft: boolean) => {
        const confirmMsg = isDraft
            ? "هل أنت متأكد من حذف هذه الفاتورة؟"
            : "تحذير: هذه فاتورة مؤكدة. حذفها سيؤدي لحذف القيود المحاسبية المرتبطة بها نهائياً. هل أنت متأكد؟";

        if (!await confirm(confirmMsg)) return;

        const res = await fetch(`/api/accounting/invoices/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchInvoices();
        } else {
            const error = await res.json();
            await alert(error.error || "فشل الحذف");
        }
    };

    const handleCancel = async (id: string) => {
        const reason = await prompt("يرجى إدخال سبب إلغاء الفاتورة:");
        if (reason === null) return;

        const res = await fetch(`/api/accounting/invoices/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", reason }),
        });

        if (res.ok) {
            fetchInvoices();
            await alert("تم إلغاء الفاتورة وعكس القيود بنجاح");
        } else {
            const error = await res.json();
            await alert(`فشل الإلغاء: ${error.error}`);
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

    const filtered = invoices.filter((inv) => {
        const term = normalizeText(searchTerm);
        return (
            normalizeText(inv.invoice_number).includes(term) ||
            normalizeText(inv.partner_name || "").includes(term)
        );
    });

    const getStateBadge = (state: string) => {
        const badges: Record<string, { color: string; text: string; icon: React.ElementType }> = {
            draft: { color: "bg-gray-100 text-gray-700", text: "مسودة (غير مدفوعة)", icon: FileText },
            posted: { color: "bg-blue-100 text-blue-700", text: "مؤكدة (غير مدفوعة)", icon: Check },
            confirmed: { color: "bg-green-100 text-green-700", text: "مدفوعة", icon: Check },
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

    const isVendor = activeTab === "vendor_bill";
    const newHref = isVendor ? "/accounting/invoices/new?type=vendor_bill" : "/accounting/invoices/new";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
                    <p className="text-gray-600 mt-1">إدارة فواتير المبيعات والمشتريات</p>
                </div>
                <Link
                    href={newHref}
                    className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg transition ${isVendor ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                    <Plus className="w-4 h-4" />
                    <span>{isVendor ? "فاتورة مورد جديدة" : "فاتورة مبيعات جديدة"}</span>
                </Link>
            </div>

            {/* Tabs: فواتير المبيعات / فواتير المشتريات */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0" aria-label="Tabs">
                    <button
                        onClick={() => { setActiveTab("customer_invoice"); setSearchTerm(""); setStateFilter(""); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "customer_invoice"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        📄 فواتير المبيعات
                    </button>
                    <button
                        onClick={() => { setActiveTab("vendor_bill"); setSearchTerm(""); setStateFilter(""); }}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "vendor_bill"
                            ? "border-orange-600 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        🧾 فواتير الموردين
                    </button>
                </nav>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={isVendor ? "بحث برقم الفاتورة أو اسم المورد..." : "بحث برقم الفاتورة أو اسم العميل..."}
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
                    <option value="draft">مسودة (غير مدفوعة)</option>
                    <option value="posted">مؤكدة (غير مدفوعة)</option>
                    <option value="confirmed">مدفوعة</option>
                    <option value="cancelled">ملغاة</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 border-b font-medium text-gray-600">
                        <tr>
                            <th className="px-6 py-3">رقم الفاتورة</th>
                            <th className="px-6 py-3">{isVendor ? "المورد" : "العميل"}</th>
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
                                <td colSpan={8} className="p-8 text-center text-gray-400">
                                    {isVendor ? "لا توجد فواتير موردين" : "لا توجد فواتير مبيعات"}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className={`px-6 py-4 font-medium ${isVendor ? "text-orange-600" : "text-blue-600"}`}>
                                        <Link href={`/accounting/invoices/${invoice.id}`} className="hover:underline">
                                            {invoice.invoice_number}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">{invoice.partner_name}</td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString("ar-SA") : "—"}
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
                                            {invoice.state === "draft" ? (
                                                <>
                                                    <Link
                                                        href={`/accounting/invoices/${invoice.id}/edit`}
                                                        className="p-1 hover:bg-yellow-50 rounded text-yellow-600"
                                                        title="تعديل"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(invoice.id, true)}
                                                        className="p-1 hover:bg-red-50 rounded text-red-600"
                                                        title="حذف"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            ) : (
                                                isSuperAdmin && (
                                                    <>
                                                        {invoice.state !== "cancelled" && (
                                                            <button
                                                                onClick={() => handleCancel(invoice.id)}
                                                                className="p-1 hover:bg-orange-50 rounded text-orange-600"
                                                                title="إلغاء الفاتورة"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(invoice.id, false)}
                                                            className="p-1 hover:bg-red-50 rounded text-red-600"
                                                            title="حذف نهائي"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )
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
