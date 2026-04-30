
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Calendar, CheckCircle, Clock, Pencil, Trash2, Loader2 } from "lucide-react";

interface PayrollRun {
    id: string;
    period_year: number;
    period_month: number;
    total_employees: number;
    total_amount: number;
    status: string;
    currency: string;
    created_by_name: string;
    created_at: string;
}

export default function PayrollListPage() {
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadRuns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hr/payroll");
            const data = await res.json();
            setRuns(Array.isArray(data) ? data : []);
        } catch {
            setRuns([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadRuns();
    }, [loadRuns]);

    async function handleDeleteDraft(id: string) {
        if (!confirm("حذف مسودة المسير نهائياً؟ لا يمكن التراجع.")) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/hr/payroll/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete" }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(typeof (body as { error?: string }).error === "string" ? (body as { error: string }).error : "تعذّر الحذف");
                return;
            }
            await loadRuns();
        } catch {
            alert("فشل الاتصال");
        } finally {
            setDeletingId(null);
        }
    }

    const getStatusBadge = (status: string) => {
        if (status === "approved" || status === "paid") {
            return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs"><CheckCircle className="w-3 h-3" /> معتمد</span>;
        }
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs"><Clock className="w-3 h-3" /> مسودة</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مسيرات الرواتب</h1>
                    <p className="text-gray-500 max-w-2xl">
                        إدارة الرواتب الشهرية. للمسودات: افتح «مراجعة وتعديل» لتعديل صفوف الموظفين والاعتماد؛ المسيرات المعتمدة للعرض والتصدير فقط.
                    </p>
                </div>
                <Link
                    href="/hr/payroll/new"
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>إنشاء مسير جديد</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">الفترة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">عدد الموظفين</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إجمالي المبلغ</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحالة</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تم الإنشاء بواسطة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
                            ) : runs.length > 0 ? (
                                runs.map((run) => (
                                    <tr key={run.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(run.period_year, run.period_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">{run.total_employees}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-green-700">
                                            {Number(run.total_amount).toLocaleString('en-US')} {run.currency || "SAR"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(run.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {run.created_by_name}
                                            <div className="text-xs text-gray-400">{new Date(run.created_at).toLocaleDateString("ar-SA")}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <Link
                                                    href={`/hr/payroll/${run.id}`}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                                        run.status === "draft"
                                                            ? "bg-violet-600 text-white hover:bg-violet-700"
                                                            : "text-violet-600 hover:bg-violet-50 border border-violet-100"
                                                    }`}
                                                >
                                                    {run.status === "draft" ? (
                                                        <>
                                                            <Pencil className="w-3.5 h-3.5" />
                                                            مراجعة وتعديل
                                                        </>
                                                    ) : (
                                                        "عرض التفاصيل"
                                                    )}
                                                </Link>
                                                {run.status === "draft" && (
                                                    <button
                                                        type="button"
                                                        disabled={deletingId === run.id}
                                                        onClick={() => void handleDeleteDraft(run.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                    >
                                                        {deletingId === run.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                        حذف
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        لا توجد مسيرات رواتب سابقة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
