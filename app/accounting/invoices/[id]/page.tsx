"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Edit, Trash2, Check, Download, Mail, DollarSign, FileText, X } from "lucide-react";

export default function InvoiceDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [invoice, setInvoice] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPdfDropdown, setShowPdfDropdown] = useState(false);
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as any)?.role === "super_admin";

    useEffect(() => {
        if (params.id) {
            fetchInvoice();
            fetchCompany();
        }
    }, [params.id]);

    async function fetchCompany() {
        try {
            const res = await fetch("/api/accounting/company-settings");
            if (res.ok) setCompany(await res.json());
        } catch (_) {}
    }

    async function fetchInvoice() {
        try {
            const res = await fetch(`/api/accounting/invoices/${params.id}`);
            if (res.ok) {
                setInvoice(await res.json());
            } else {
                router.push("/accounting/invoices");
            }
        } finally {
            setLoading(false);
        }
    }

    const handleConfirm = async () => {
        if (!confirm("هل أنت متأكد من تأكيد الفاتورة؟ لن يمكن التعديل بعد التأكيد.")) return;

        const res = await fetch(`/api/accounting/invoices/${params.id}/confirm`, {
            method: "POST",
        });

        if (res.ok) {
            fetchInvoice();
            alert("تم تأكيد الفاتورة بنجاح");
        } else {
            const error = await res.json();
            alert(`فشل التأكيد: ${error.error}`);
        }
    };

    const handleDelete = async () => {
        if (!confirm("هل أنت متأكد من حذف الفاتورة؟")) return;

        const res = await fetch(`/api/accounting/invoices/${params.id}`, {
            method: "DELETE",
        });

        if (res.ok) {
            router.push("/accounting/invoices");
        } else {
            const error = await res.json();
            alert(`فشل الحذف: ${error.error}`);
        }
    };

    const handleCancel = async () => {
        const reason = prompt("يرجى إدخال سبب إلغاء الفاتورة:");
        if (reason === null) return; // Cancelled prompt

        const res = await fetch(`/api/accounting/invoices/${params.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", reason }),
        });

        if (res.ok) {
            fetchInvoice();
            alert("تم إلغاء الفاتورة وعكس القيد المحاسبي بنجاح");
        } else {
            const error = await res.json();
            alert(`فشل الإلغاء: ${error.error}`);
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا السند؟ سيتم تحديث رصيد الفاتورة.")) return;

        const res = await fetch(`/api/accounting/payments/${paymentId}`, {
            method: "DELETE",
        });

        if (res.ok) {
            fetchInvoice();
            alert("تم حذف السند وتحديث الرصيد");
        } else {
            const error = await res.json();
            alert(`فشل الحذف: ${error.error}`);
        }
    };

    const downloadPDF = () => {
        window.open(`/api/accounting/invoices/${params.id}/pdf`, "_blank");
    };

    if (loading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    if (!invoice) {
        return <div className="p-8 text-center text-red-600">الفاتورة غير موجودة</div>;
    }

    const getStateBadge = (state: string) => {
        const badges: Record<string, { color: string; text: string }> = {
            draft: { color: "bg-gray-100 text-gray-700", text: "مسودة" },
            confirmed: { color: "bg-blue-100 text-blue-700", text: "مؤكدة" },
            partial: { color: "bg-yellow-100 text-yellow-700", text: "دفع جزئي" },
            paid: { color: "bg-green-100 text-green-700", text: "مدفوعة" },
            cancelled: { color: "bg-red-100 text-red-700", text: "ملغاة" },
        };
        const badge = badges[state] || badges.draft;
        return <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>{badge.text}</span>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/accounting/invoices" className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                    <p className="text-gray-600 mt-1">تفاصيل الفاتورة</p>
                </div>
                <div className="flex gap-2">
                    {invoice.state === "draft" && (
                        <>
                            <button
                                onClick={handleConfirm}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                            >
                                <Check className="w-4 h-4" />
                                تأكيد الفاتورة
                            </button>
                            <Link
                                href={`/accounting/invoices/${params.id}/edit`}
                                className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50"
                            >
                                <Edit className="w-4 h-4" />
                                تعديل
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="flex items-center gap-2 border border-red-500 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                حذف
                            </button>
                        </>
                    )}
                    {invoice.state !== "draft" && (
                        <>
                            {isSuperAdmin && invoice.state !== "cancelled" && (
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center gap-2 border border-orange-500 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50"
                                >
                                    <X className="w-4 h-4" />
                                    إلغاء الفاتورة
                                </button>
                            )}
                            {isSuperAdmin && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 border border-red-500 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    حذف نهائي
                                </button>
                            )}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowPdfDropdown(!showPdfDropdown)}
                                    className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50 bg-white"
                                >
                                    <Download className="w-4 h-4" />
                                    PDF
                                </button>
                                {showPdfDropdown && (
                                    <div className="absolute left-0 top-full mt-2 w-56 bg-white border rounded-lg shadow-xl z-50 p-1 animate-in fade-in zoom-in duration-200">
                                        <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b mb-1">اختر سمة القالب</div>
                                        <button
                                            onClick={() => {
                                                window.open(`/api/accounting/invoices/${params.id}/pdf?theme=default`, "_blank");
                                                setShowPdfDropdown(false);
                                            }}
                                            className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-md flex items-center gap-3"
                                        >
                                            <div className="w-5 h-5 rounded-md border bg-white shadow-sm italic text-[8px] flex items-center justify-center text-gray-300">Aa</div>
                                            <span>الافتراضي (أبيض)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                window.open(`/api/accounting/invoices/${params.id}/pdf?theme=eye-friendly`, "_blank");
                                                setShowPdfDropdown(false);
                                            }}
                                            className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 rounded-md flex items-center gap-3"
                                        >
                                            <div className="w-5 h-5 rounded-md border bg-[#FDFBF7] shadow-sm italic text-[8px] flex items-center justify-center text-amber-900/50">Aa</div>
                                            <span>مريح للعين (كريمي)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                window.open(`/api/accounting/invoices/${params.id}/pdf?theme=dark`, "_blank");
                                                setShowPdfDropdown(false);
                                            }}
                                            className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md flex items-center gap-3"
                                        >
                                            <div className="w-5 h-5 rounded-md border bg-gray-900 shadow-sm italic text-[8px] flex items-center justify-center text-gray-400">Aa</div>
                                            <span>الوضع الليلي (داكن)</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button className="flex items-center gap-2 border px-4 py-2 rounded-lg hover:bg-gray-50">
                                <Mail className="w-4 h-4" />
                                إرسال
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Invoice Preview */}
            <div className="bg-white border rounded-xl shadow-sm p-8">
                {/* Status */}
                <div className="flex justify-between items-start mb-8">
                    {/* Company Info - Right Side */}
                    <div className="flex items-center gap-3">
                        {company?.logo_url ? (
                            <img
                                src={company.logo_url}
                                alt={company.company_name}
                                className="h-16 w-auto object-contain"
                            />
                        ) : (
                            <div className="h-16 w-16 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-2xl">
                                {company?.company_name?.charAt(0) || "N"}
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-lg">{company?.company_name || "—"}</p>
                            {company?.tax_number && <p className="text-gray-500 text-sm">الرقم الضريبي: {company.tax_number}</p>}
                            {company?.commercial_registration && <p className="text-gray-500 text-sm">السجل التجاري: {company.commercial_registration}</p>}
                            {company?.phone && <p className="text-gray-500 text-sm">{company.phone}</p>}
                        </div>
                    </div>
                    {/* Invoice Number + Status - Left Side */}
                    <div className="text-left">
                        <h2 className="text-3xl font-bold">{invoice.invoice_number}</h2>
                        <p className="text-gray-500 mt-1 mb-2 font-bold text-lg">{company?.invoice_type_label || "فاتورة ضريبية"}</p>
                        {getStateBadge(invoice.state)}
                    </div>
                </div>

                {/* Customer & Dates */}
                <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-2">العميل</h3>
                        <p className="font-bold text-lg">{invoice.partner_name}</p>
                        {invoice.partner_email && <p className="text-gray-600">{invoice.partner_email}</p>}
                        {invoice.partner_phone && <p className="text-gray-600">{invoice.partner_phone}</p>}
                        {invoice.address && <p className="text-gray-500 text-sm mt-2">{invoice.address}</p>}
                    </div>
                    <div className="text-left">
                        <div className="space-y-2">
                            <div>
                                <span className="text-sm text-gray-500">تاريخ الفاتورة:</span>
                                <span className="font-medium mr-2">
                                    {new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}
                                </span>
                            </div>
                            <div>
                                <span className="text-sm text-gray-500">تاريخ الاستحقاق:</span>
                                <span className="font-medium mr-2">
                                    {new Date(invoice.due_date).toLocaleDateString("ar-SA")}
                                </span>
                            </div>
                            {invoice.reference && (
                                <div>
                                    <span className="text-sm text-gray-500">المرجع:</span>
                                    <span className="font-medium mr-2">{invoice.reference}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <table className="w-full mb-8">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-right text-sm font-medium">الوصف</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">الكمية</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">السعر</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">الضريبة</th>
                            <th className="px-4 py-3 text-right text-sm font-medium">المجموع</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoice.lines?.map((line: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-4 py-3">{line.description}</td>
                                <td className="px-4 py-3">{parseFloat(line.quantity).toLocaleString("ar-SA")}</td>
                                <td className="px-4 py-3">{parseFloat(line.unit_price).toLocaleString("ar-SA")} ر.س</td>
                                <td className="px-4 py-3">{parseFloat(line.tax_rate)}%</td>
                                <td className="px-4 py-3 font-medium">
                                    {parseFloat(line.line_total_with_tax).toLocaleString("ar-SA")} ر.س
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-80 space-y-3">
                        <div className="flex justify-between text-gray-600">
                            <span>المجموع الفرعي:</span>
                            <span>{parseFloat(invoice.subtotal).toLocaleString("ar-SA")} ر.س</span>
                        </div>
                        {parseFloat(invoice.discount_amount) > 0 && (
                            <div className="flex justify-between text-red-600">
                                <span>الخصم:</span>
                                <span>-{parseFloat(invoice.discount_amount).toLocaleString("ar-SA")} ر.س</span>
                            </div>
                        )}
                        <div className="flex justify-between text-green-600">
                            <span>الضريبة:</span>
                            <span>+{parseFloat(invoice.tax_amount).toLocaleString("ar-SA")} ر.س</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold pt-3 border-t">
                            <span>الإجمالي:</span>
                            <span>{parseFloat(invoice.total_amount).toLocaleString("ar-SA")} ر.س</span>
                        </div>
                        {invoice.state !== "draft" && (
                            <>
                                <div className="flex justify-between text-blue-600">
                                    <span>المدفوع:</span>
                                    <span>-{parseFloat(invoice.amount_paid).toLocaleString("ar-SA")} ر.س</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold text-red-600">
                                    <span>المتبقي:</span>
                                    <span>{parseFloat(invoice.amount_due).toLocaleString("ar-SA")} ر.س</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Notes & Attachments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t">
                    <div>
                        {invoice.notes && (
                            <>
                                <h3 className="text-sm font-medium text-gray-500 mb-2">ملاحظات</h3>
                                <p className="text-gray-700">{invoice.notes}</p>
                            </>
                        )}
                        {invoice.payment_terms && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-500 mb-2">شروط الدفع</h3>
                                <p className="text-gray-700 whitespace-pre-line">{invoice.payment_terms || company?.invoice_terms}</p>
                            </div>
                        )}
                    </div>
                    {invoice.attachment_url && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-dashed text-left">
                            <h3 className="text-sm font-medium text-gray-500 mb-2">المرفقات</h3>
                            <a
                                href={invoice.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                            >
                                <FileText className="w-5 h-5" />
                                <span>عرض المرفق (صورة/PDF)</span>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
                <div className="bg-white border rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-bold mb-4">سجل الدفعات</h2>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-2 text-right">رقم الدفعة</th>
                                <th className="px-4 py-2 text-right">التاريخ</th>
                                <th className="px-4 py-2 text-right">المبلغ</th>
                                <th className="px-4 py-2 text-right">الطريقة</th>
                                <th className="px-4 py-2 text-left">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {invoice.payments.map((payment: any) => (
                                <tr key={payment.id}>
                                    <td className="px-4 py-2 font-medium">{payment.payment_number}</td>
                                    <td className="px-4 py-2">
                                        {new Date(payment.payment_date).toLocaleDateString("ar-SA")}
                                    </td>
                                    <td className="px-4 py-2">{parseFloat(payment.amount).toLocaleString("ar-SA")} ر.س</td>
                                    <td className="px-4 py-2">{payment.payment_method}</td>
                                    <td className="px-4 py-2 text-left">
                                        {isSuperAdmin && (
                                            <button
                                                onClick={() => handleDeletePayment(payment.payment_id)}
                                                className="p-1 hover:bg-red-50 rounded text-red-600 transition"
                                                title="حذف السند"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
