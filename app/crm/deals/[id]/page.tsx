"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ArrowRight, User, DollarSign, Calendar, Flag,
    Clock, Phone, Mail, FileText, Edit3, Loader2,
    CheckCircle2, XCircle, Handshake, CreditCard, PackageCheck,
    BadgeCheck, MessagesSquare, AlertTriangle, History,
    MessageSquare, PhoneCall, CalendarDays, MailIcon, RefreshCw,
    StickyNote, Activity, Trash2, Archive, RotateCcw
} from "lucide-react";

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    new: { label: 'جديد', color: 'text-slate-700', bg: 'bg-slate-100', icon: Clock },
    contacting: { label: 'جاري التواصل', color: 'text-blue-700', bg: 'bg-blue-100', icon: Phone },
    qualified: { label: 'مؤهل', color: 'text-cyan-700', bg: 'bg-cyan-100', icon: BadgeCheck },
    proposal: { label: 'إرسال عرض', color: 'text-violet-700', bg: 'bg-violet-100', icon: FileText },
    negotiation: { label: 'تفاوض', color: 'text-amber-700', bg: 'bg-amber-100', icon: MessagesSquare },
    won: { label: 'تم الاتفاق', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: Handshake },
    paid: { label: 'تم الدفع', color: 'text-teal-700', bg: 'bg-teal-100', icon: CreditCard },
    completed: { label: 'مكتمل', color: 'text-green-700', bg: 'bg-green-100', icon: PackageCheck },
    lost: { label: 'خسارة', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    high: { label: 'عاجل', color: 'text-red-700', bg: 'bg-red-100' },
    medium: { label: 'متوسطة', color: 'text-amber-700', bg: 'bg-amber-100' },
    low: { label: 'منخفضة', color: 'text-green-700', bg: 'bg-green-100' },
};

const ACTIVITY_ICONS: Record<string, any> = {
    status_change: RefreshCw,
    note: StickyNote,
    call: PhoneCall,
    meeting: CalendarDays,
    email: MailIcon,
    log: Activity,
};

const ACTIVITY_COLORS: Record<string, string> = {
    status_change: 'bg-blue-500',
    note: 'bg-amber-500',
    call: 'bg-green-500',
    meeting: 'bg-violet-500',
    email: 'bg-cyan-500',
    log: 'bg-gray-500',
};

function formatDate(d: string | null | undefined): string {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("ar-SA", {
            year: "numeric", month: "long", day: "numeric"
        });
    } catch { return d; }
}

function formatDateTime(d: string | null | undefined): string {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("ar-SA", {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    } catch { return d; }
}

function formatValue(v: number | string | null | undefined): string {
    const n = Number(v);
    if (!n || !Number.isFinite(n)) return "0";
    return n.toLocaleString("ar-SA");
}

function timeAgo(d: string): string {
    try {
        const now = new Date();
        const date = new Date(d);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "الآن";
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 30) return `منذ ${diffDays} يوم`;
        return formatDateTime(d);
    } catch { return d; }
}

export default function DealDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [deal, setDeal] = useState<any>(null);
    const [activities, setActivities] = useState<any[]>([]);
    const [error, setError] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
    const [archiving, setArchiving] = useState(false);

    const loadDeal = useCallback((opts?: { silent?: boolean }) => {
        if (!id) return;
        const silent = Boolean(opts?.silent);
        if (!silent) setLoading(true);
        fetch(`/api/crm/deals/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setDeal(data.deal);
                    setActivities(data.activities || []);
                }
            })
            .catch(() => setError("خطأ في تحميل بيانات الصفقة"))
            .finally(() => {
                if (!silent) setLoading(false);
            });
    }, [id]);

    useEffect(() => {
        loadDeal();
    }, [loadDeal]);

    const handleArchiveOrReopen = async (nextStatus: "open" | "closed") => {
        setArchiving(true);
        try {
            const res = await fetch("/api/crm/deals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: nextStatus }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setArchiveDialogOpen(false);
                loadDeal({ silent: true });
            } else {
                alert((data as { error?: string }).error || "تعذّر تحديث حالة الصفقة");
            }
        } catch {
            alert("حدث خطأ أثناء تحديث الصفقة");
        } finally {
            setArchiving(false);
        }
    };

    const handleDeleteDeal = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/crm/deals/${id}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                router.replace("/crm/deals");
                return;
            }
            alert((data as { error?: string }).error || "تعذّر حذف الصفقة");
        } catch {
            alert("حدث خطأ أثناء الحذف");
        } finally {
            setDeleting(false);
            setDeleteDialogOpen(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-sm">جاري تحميل الصفقة...</span>
                </div>
            </div>
        );
    }

    if (error || !deal) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <XCircle className="w-12 h-12 text-red-300" />
                <p className="text-gray-500">{error || "الصفقة غير موجودة"}</p>
                <Link href="/crm/deals" className="text-blue-600 hover:underline text-sm">العودة للصفقات</Link>
            </div>
        );
    }

    const stage = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.new;
    const priority = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
    const StageIcon = stage.icon;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {archiveDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="archive-deal-title"
                >
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <h2 id="archive-deal-title" className="text-lg font-bold text-gray-900">
                            أرشفة الصفقة؟
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            الأرشفة تعني إنهاء متابعة الصفقة: تبقى كل البيانات والسجل في النظام، وتنتقل الصفقة
                            إلى تبويب «المؤرشفة» في مسار الصفقات. هذا{" "}
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
                                onClick={() => handleArchiveOrReopen("closed")}
                                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {archiving ? "جاري التنفيذ..." : "تأكيد الأرشفة"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteDialogOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-deal-title"
                >
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <h2 id="delete-deal-title" className="text-lg font-bold text-gray-900">
                            حذف الصفقة نهائياً؟
                        </h2>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            سيتم <span className="font-semibold text-red-700">مسح</span> الصفقة{" "}
                            <span className="font-semibold text-gray-900">{deal.title}</span> وسجل أنشطتها من
                            قاعدة البيانات. لا يمكن التراجع. إذا أردت الإبقاء على السجل استخدم «أرشفة الصفقة».
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
                                onClick={handleDeleteDeal}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? "جاري الحذف..." : "حذف نهائي"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-4">
                <Link href="/crm/deals" className="p-2 hover:bg-gray-100 rounded-lg mt-1 transition">
                    <ArrowRight className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap justify-between">
                        <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${stage.bg} ${stage.color}`}>
                            <StageIcon className="w-3.5 h-3.5" />
                            {stage.label}
                        </span>
                        {deal.status === 'closed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-100">
                                مؤرشفة
                            </span>
                        )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {deal.status === "open" ? (
                                <button
                                    type="button"
                                    onClick={() => setArchiveDialogOpen(true)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/80 text-amber-900 text-sm font-medium hover:bg-amber-100 transition"
                                >
                                    <Archive className="w-4 h-4" />
                                    أرشفة الصفقة
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={archiving}
                                    onClick={() => {
                                        if (!confirm("إعادة فتح الصفقة وإرجاعها للمسار النشط؟")) return;
                                        void handleArchiveOrReopen("open");
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    إعادة فتح
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setDeleteDialogOpen(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                                حذف نهائي
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                        #{deal.id.substring(0, 8)} • أنشئت {formatDate(deal.created_at)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ────── Main Info (2 cols) ────── */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Deal Info Card */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                بيانات الصفقة
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Value */}
                                <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">قيمة الصفقة</p>
                                        <p className="font-bold text-gray-900">{formatValue(deal.value)} <span className="text-sm font-normal text-gray-400">ر.س</span></p>
                                    </div>
                                </div>

                                {/* Priority */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className={`w-10 h-10 rounded-xl ${priority.bg} flex items-center justify-center`}>
                                        <Flag className={`w-5 h-5 ${priority.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">الأولوية</p>
                                        <p className={`font-bold ${priority.color}`}>{priority.label}</p>
                                    </div>
                                </div>

                                {/* Expected Close */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">تاريخ الإغلاق المتوقع</p>
                                        <p className="font-bold text-gray-900">{formatDate(deal.expected_close_date)}</p>
                                    </div>
                                </div>

                                {/* Last Updated */}
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">آخر تحديث</p>
                                        <p className="font-bold text-gray-900 text-sm">{formatDateTime(deal.updated_at)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {deal.notes && (
                                <div className="mt-5 pt-5 border-t">
                                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                                        ملاحظات
                                    </h3>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap leading-relaxed">{deal.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ────── Activities Timeline ────── */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <History className="w-4 h-4 text-gray-500" />
                                    سجل الأنشطة والتحديثات
                                </h2>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{activities.length} نشاط</span>
                            </div>
                        </div>

                        {activities.length > 0 ? (
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute right-[29px] top-0 bottom-0 w-px bg-gray-200" />

                                <div className="divide-y divide-gray-50">
                                    {activities.map((act, idx) => {
                                        const ActIcon = ACTIVITY_ICONS[act.type] || Activity;
                                        const dotColor = ACTIVITY_COLORS[act.type] || 'bg-gray-400';
                                        return (
                                            <div key={act.id || idx} className="relative px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                                <div className="flex gap-4">
                                                    {/* Timeline Dot */}
                                                    <div className="relative z-10 flex-shrink-0">
                                                        <div className={`w-8 h-8 rounded-full ${dotColor} flex items-center justify-center shadow-sm`}>
                                                            <ActIcon className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold text-gray-900 text-sm">{act.title}</p>
                                                                {act.description && (
                                                                    <p className="text-sm text-gray-600 mt-0.5">{act.description}</p>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-gray-400 flex-shrink-0 mt-0.5">{timeAgo(act.performed_at)}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-2">
                                                            {act.performed_by_name && (
                                                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                    <User className="w-3 h-3" />
                                                                    {act.performed_by_name}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-gray-400">
                                                                {formatDateTime(act.performed_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <History className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">لا توجد أنشطة مسجلة</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ────── Sidebar (1 col) ────── */}
                <div className="space-y-5">
                    {/* Customer Info */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <User className="w-4 h-4 text-gray-500" />
                                بيانات العميل
                            </h3>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                                    <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-gray-900 truncate">{deal.customer_name || "—"}</p>
                                    <Link 
                                        href={`/crm/customers/${deal.customer_id}`}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        عرض ملف العميل
                                    </Link>
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                {deal.customer_phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span dir="ltr">{deal.customer_phone}</span>
                                    </div>
                                )}
                                {deal.customer_email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="truncate">{deal.customer_email}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Assigned Employee */}
                    {deal.assigned_to_name && (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 text-sm">المسؤول</h3>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center">
                                        <User className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">{deal.assigned_to_name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stage Progress */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 border-b bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                                مراحل الصفقة
                            </h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-1">
                                {Object.entries(STAGE_CONFIG).map(([key, cfg]) => {
                                    const stageOrder = Object.keys(STAGE_CONFIG);
                                    const currentIdx = stageOrder.indexOf(deal.stage);
                                    const thisIdx = stageOrder.indexOf(key);
                                    const isActive = key === deal.stage;
                                    const isPassed = thisIdx < currentIdx && key !== 'lost';
                                    const Icon = cfg.icon;

                                    return (
                                        <div
                                            key={key}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                                                isActive ? `${cfg.bg} ${cfg.color} font-semibold` :
                                                isPassed ? 'text-gray-400' : 'text-gray-300'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                isActive ? cfg.bg : isPassed ? 'bg-green-100' : 'bg-gray-100'
                                            }`}>
                                                {isPassed ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                ) : (
                                                    <Icon className={`w-3 h-3 ${isActive ? cfg.color : 'text-gray-300'}`} />
                                                )}
                                            </div>
                                            <span className="text-xs">{cfg.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
