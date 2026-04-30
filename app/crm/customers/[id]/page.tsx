"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Phone,
    Mail,
    MapPin,
    Edit,
    Calendar,
    MessageSquare,
    PhoneCall,
    FileText,
    Clock,
    CheckCircle,
    Plus,
    User,
    Building2,
    Trophy,
    Sparkles,
    Trash2,
    Archive,
    RotateCcw,
    Save,
} from "lucide-react";
import CustomerTags from "./CustomerTags";
import type { CrmActivity, CrmDeal, CustomerDetailResponse } from "@/lib/types/crm";
import { activityTitleForType } from "@/lib/types/crm";

export default function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [data, setData] = useState<CustomerDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [activityForm, setActivityForm] = useState({ type: "note", description: "" });
    const [submitting, setSubmitting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [generalNotes, setGeneralNotes] = useState("");
    const [notesDirty, setNotesDirty] = useState(false);
    const [notesSaving, setNotesSaving] = useState(false);

    const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
        const silent = Boolean(opts?.silent);
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`/api/crm/customers/${id}`);
            if (res.ok) {
                const json = (await res.json()) as CustomerDetailResponse;
                setData({
                    ...json,
                    activities: Array.isArray(json.activities) ? json.activities : [],
                    deals: Array.isArray(json.deals) ? json.deals : [],
                    total_deal_count:
                        typeof json.total_deal_count === "number"
                            ? json.total_deal_count
                            : json.deals?.length ?? 0,
                });
            } else {
                router.replace("/crm/customers");
            }
        } catch (e) {
            console.error(e);
            router.replace("/crm/customers");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        setNotesDirty(false);
    }, [id]);

    useEffect(() => {
        if (!data?.customer || data.customer.id !== id) return;
        if (!notesDirty) {
            setGeneralNotes(data.customer.notes ?? "");
        }
    }, [id, data?.customer, notesDirty]);

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activityForm.description) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/crm/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id: id,
                    type: activityForm.type,
                    title: activityTitleForType(activityForm.type),
                    description: activityForm.description,
                }),
            });

            if (res.ok) {
                setActivityForm({ type: "note", description: "" });
                void fetchData({ silent: true });
            } else {
                const err = await res.json().catch(() => ({}));
                alert((err as { error?: string }).error || "تعذّر تسجيل النشاط");
            }
        } catch {
            alert("حدث خطأ أثناء تسجيل النشاط");
        } finally {
            setSubmitting(false);
        }
    };

    const putCustomerStatus = async (status: string) => {
        if (!data?.customer) return false;
        const c = data.customer;
        const res = await fetch(`/api/crm/customers/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: c.full_name,
                phone: c.phone,
                email: c.email,
                national_id: c.national_id,
                address: c.address,
                type: c.type,
                notes: c.notes,
                status,
            }),
        });
        const errBody = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert((errBody as { error?: string }).error || "تعذّر تحديث حالة العميل");
            return false;
        }
        await fetchData({ silent: true });
        return true;
    };

    const saveGeneralNotes = async () => {
        if (!data?.customer) return;
        setNotesSaving(true);
        try {
            const c = data.customer;
            const res = await fetch(`/api/crm/customers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: c.full_name,
                    phone: c.phone,
                    email: c.email,
                    national_id: c.national_id,
                    address: c.address,
                    type: c.type,
                    notes: generalNotes.trim() === "" ? null : generalNotes.trim(),
                    status: c.status,
                }),
            });
            const err = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert((err as { error?: string }).error || "تعذّر حفظ الملاحظات");
                return;
            }
            const saved = generalNotes.trim() === "" ? null : generalNotes.trim();
            setNotesDirty(false);
            setData((prev) =>
                prev ? { ...prev, customer: { ...prev.customer, notes: saved } } : prev
            );
        } catch {
            alert("حدث خطأ أثناء حفظ الملاحظات");
        } finally {
            setNotesSaving(false);
        }
    };

    const handleArchiveCustomer = async () => {
        setArchiving(true);
        try {
            const ok = await putCustomerStatus("archived");
            if (ok) setArchiveDialogOpen(false);
        } finally {
            setArchiving(false);
        }
    };

    const handleRestoreCustomer = async () => {
        setArchiving(true);
        try {
            await putCustomerStatus("active");
        } finally {
            setArchiving(false);
        }
    };

    const handleDeleteCustomer = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/crm/customers/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                router.replace("/crm/customers");
                return;
            }
            alert((data as { error?: string }).error || "تعذّر حذف العميل");
        } catch {
            alert("حدث خطأ أثناء الحذف");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    if (loading) return <div className="p-12 text-center">جاري التحميل...</div>;
    if (!data) return null;

    const { customer, activities, deals } = data;
    const totalDealCount =
        typeof data.total_deal_count === "number" ? data.total_deal_count : deals.length;
    const isArchived = customer.status === "archived";
    const statusLabel =
        customer.status === "active" ? "نشط" : customer.status === "archived" ? "مؤرشف" : customer.status;

    return (
        <div className="space-y-6">
            {deleteDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-customer-title"
                >
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <h2 id="delete-customer-title" className="text-lg font-bold text-gray-900">
                            حذف العميل نهائياً؟
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            سيتم <span className="font-semibold text-red-700">مسح</span>{" "}
                            <span className="font-semibold text-gray-900">{customer.full_name}</span> وكل
                            صفقاته ونشاطاته ووسومه من النظام نهائياً. لا يمكن التراجع. للإخفاء فقط مع الإبقاء على
                            السجل استخدم «أرشفة العميل».
                        </p>
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setDeleteDialogOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleDeleteCustomer}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "جاري الحذف..." : "حذف نهائي"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {archiveDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="archive-customer-title"
                >
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <h2 id="archive-customer-title" className="text-lg font-bold text-gray-900">
                            أرشفة العميل؟
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            الأرشفة تخفي العميل من قائمة العملاء النشطة مع الإبقاء على كل البيانات والصفقات
                            والسجل. يمكنك لاحقاً استعادته من هنا. هذا{" "}
                            <span className="font-semibold">ليس</span> حذفاً نهائياً.
                        </p>
                        <div className="flex gap-2 justify-end pt-2">
                            <button
                                type="button"
                                disabled={archiving}
                                onClick={() => setArchiveDialogOpen(false)}
                                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                disabled={archiving}
                                onClick={handleArchiveCustomer}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {archiving ? "جاري التنفيذ..." : "تأكيد الأرشفة"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isArchived && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    هذا العميل <span className="font-semibold">مؤرشف</span>: لا يظهر في قائمة العملاء الافتراضية،
                    وكل بياناته محفوظة. استخدم «استعادة من الأرشيف» لإرجاعه للقائمة النشطة، أو «حذف نهائي» لمسحه
                    من النظام بالكامل.
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                                customer.type === "company"
                                    ? "bg-purple-100 text-purple-600"
                                    : "bg-blue-100 text-blue-600"
                            }`}
                        >
                            {customer.type === "company" ? (
                                <Building2 className="w-8 h-8" />
                            ) : (
                                <User className="w-8 h-8" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{customer.full_name}</h1>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                        customer.status === "active"
                                            ? "bg-green-100 text-green-700"
                                            : customer.status === "archived"
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-red-100 text-red-700"
                                    }`}
                                >
                                    {statusLabel}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-gray-500 text-sm">
                                {totalDealCount > 0 ? (
                                    <div className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-bold border border-amber-200 flex items-center gap-2">
                                        <Trophy className="w-4 h-4" />
                                        <span>
                                            عميل له صفقات ({totalDealCount}{" "}
                                            {totalDealCount === 1 ? "صفقة" : "صفقات"})
                                        </span>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 font-medium border border-blue-100 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" />
                                        <span>بدون صفقات مسجلة</span>
                                    </div>
                                )}

                                <CustomerTags customerId={customer.id} />

                                <div className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    <span dir="ltr">{customer.phone || "—"}</span>
                                </div>
                                {customer.email && (
                                    <div className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        <span>{customer.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/crm/deals/new?customer_id=${id}`}
                            aria-disabled={isArchived}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                                isArchived
                                    ? "pointer-events-none opacity-45 bg-gray-300 text-gray-600"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                            title={isArchived ? "استعد العميل من الأرشيف لإضافة صفقات جديدة" : undefined}
                        >
                            <Plus className="w-4 h-4" />
                            صفقة جديدة
                        </Link>
                        <Link
                            href={`/crm/customers/${id}/edit`}
                            className="bg-white border text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <Edit className="w-4 h-4" />
                            تعديل
                        </Link>
                        {!isArchived ? (
                            <button
                                type="button"
                                onClick={() => setArchiveDialogOpen(true)}
                                className="bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                            >
                                <Archive className="w-4 h-4" />
                                أرشفة العميل
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={archiving}
                                onClick={() => {
                                    if (!confirm("استعادة العميل وإظهاره في قائمة العملاء النشطة؟")) return;
                                    void handleRestoreCustomer();
                                }}
                                className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                            >
                                <RotateCcw className="w-4 h-4" />
                                استعادة من الأرشيف
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setDeleteDialogOpen(true)}
                            className="bg-white border border-red-200 text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                        >
                            <Trash2 className="w-4 h-4" />
                            حذف نهائي
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-gray-500" />
                            تسجيل نشاط
                        </h3>
                        <form onSubmit={handleAddActivity}>
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: "note" })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                                        activityForm.type === "note"
                                            ? "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200"
                                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    }`}
                                >
                                    ملاحظة
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: "call" })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                                        activityForm.type === "call"
                                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    }`}
                                >
                                    اتصال
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivityForm({ ...activityForm, type: "meeting" })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                                        activityForm.type === "meeting"
                                            ? "bg-purple-50 text-purple-700 ring-1 ring-purple-200"
                                            : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    }`}
                                >
                                    اجتماع
                                </button>
                            </div>
                            <textarea
                                required
                                name="activity_description"
                                autoComplete="off"
                                value={activityForm.description}
                                onChange={(e) =>
                                    setActivityForm({ ...activityForm, description: e.target.value })
                                }
                                placeholder="اكتب تفاصيل النشاط هنا..."
                                className="w-full border rounded-lg p-3 min-h-[100px] focus:ring-2 focus:ring-blue-500 outline-none mb-3 relative z-[1]"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                                >
                                    {submitting ? "جاري الحفظ..." : "تسجيل"}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-6 relative">
                        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-gray-500" />
                            سجل النشاطات (Timeline)
                        </h3>

                        <div className="space-y-8 relative before:pointer-events-none before:absolute before:inset-0 before:mr-5 before:-ml-px before:h-full before:w-0.5 before:bg-gray-100 before:z-0">
                            {activities.map((activity: CrmActivity) => (
                                <div key={activity.id} className="relative z-10 flex gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0 ${
                                            activity.type === "call"
                                                ? "bg-blue-100 text-blue-600"
                                                : activity.type === "meeting"
                                                  ? "bg-purple-100 text-purple-600"
                                                  : activity.type === "status_change"
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-yellow-100 text-yellow-600"
                                        }`}
                                    >
                                        {activity.type === "call" ? (
                                            <PhoneCall className="w-4 h-4" />
                                        ) : activity.type === "meeting" ? (
                                            <Calendar className="w-4 h-4" />
                                        ) : activity.type === "status_change" ? (
                                            <CheckCircle className="w-4 h-4" />
                                        ) : (
                                            <FileText className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-gray-900">{activity.title}</span>
                                            <span className="text-xs text-gray-400" dir="ltr">
                                                {new Date(activity.performed_at).toLocaleString("ar-EG")}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm whitespace-pre-wrap">
                                            {activity.description}
                                        </p>
                                        <div className="mt-2 text-xs text-gray-400">
                                            بواسطة: {activity.performed_by_name || "النظام"}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {activities.length === 0 && (
                                <p className="text-center text-gray-400 py-8">لا توجد نشاطات مسجلة بعد</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <h3 className="font-bold text-gray-900 text-sm">ملاحظات عامة</h3>
                            <button
                                type="button"
                                disabled={notesSaving || !notesDirty}
                                onClick={() => void saveGeneralNotes()}
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 disabled:pointer-events-none transition"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {notesSaving ? "جاري الحفظ..." : "حفظ"}
                            </button>
                        </div>
                        <textarea
                            name="customer_general_notes"
                            autoComplete="off"
                            value={generalNotes}
                            onChange={(e) => {
                                setNotesDirty(true);
                                setGeneralNotes(e.target.value);
                            }}
                            placeholder="اكتب ملاحظات عامة عن العميل (مرئية للفريق)..."
                            rows={5}
                            className="w-full text-sm text-gray-800 bg-yellow-50 p-3 rounded-lg border border-yellow-100 min-h-[100px] focus:ring-2 focus:ring-amber-400 focus:border-amber-300 outline-none resize-y relative z-[1]"
                        />
                        <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
                            تُحفظ في ملف العميل وليست نفس «سجل النشاطات». اضغط «حفظ» بعد التعديل.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 text-sm">الصفقات النشطة</h3>
                            <Link
                                href={`/crm/deals/new?customer_id=${id}`}
                                className="text-blue-600 text-xs hover:underline"
                            >
                                + إضافة
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {deals.map((deal: CrmDeal) => (
                                <div key={deal.id} className="border rounded-lg p-3 hover:bg-gray-50 transition block">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-800">{deal.title}</span>
                                        <span
                                            className={`text-[10px] px-2 py-1 rounded-full ${
                                                deal.stage === "won"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-blue-100 text-blue-700"
                                            }`}
                                        >
                                            {deal.stage}
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                                        <span>{deal.value} ر.س</span>
                                        {deal.expected_close_date && (
                                            <span>
                                                {new Date(deal.expected_close_date).toLocaleDateString("ar-EG")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {deals.length === 0 && (
                                <p className="text-center text-gray-400 text-xs py-4">لا توجد صفقات مفتوحة</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
