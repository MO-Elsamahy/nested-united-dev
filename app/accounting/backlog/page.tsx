"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { useDialog } from "@/components/accounting/DialogProvider";

interface AuditLog {
    id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: unknown;
    created_at: string;
}

export default function BacklogPage() {
    const { confirm, alert } = useDialog();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch("/api/accounting/audit");
            if (res.ok) setLogs(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    async function handleRestore(logId: string) {
        if (!await confirm("هل أنت متأكد من استعادة حالة النظام بالكامل إلى هذه اللحظة؟ سيتم التراجع عن جميع الحركات التي تمت بعد هذا الإجراء.")) return;
        try {
            const res = await fetch(`/api/accounting/restore?log_id=${logId}`, { method: "POST" });
            if (res.ok) {
                await alert("تمت استعادة حالة النظام بنجاح");
                fetchLogs();
            } else {
                const data = await res.json().catch(() => ({}));
                await alert(data.error || "فشل الاستعادة");
            }
        } catch (_e) {
            await alert("حدث خطأ أثناء الاتصال بالخادم");
        }
    }

    const latestSystemRestoreLog = logs.find(log => log.action === 'restore' && log.entity_type === 'system');
    const lastRestoredLogId = latestSystemRestoreLog ? latestSystemRestoreLog.entity_id : null;
    const latestActualLog = logs.find(log => log.entity_type !== 'system');
    const latestActualLogId = latestActualLog ? latestActualLog.id : null;

    function getActionLabel(log: AuditLog) {
        if (log.action === 'restore' && log.entity_type === 'system') {
            return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">استعادة النظام</span>;
        }
        switch (log.action) {
            case 'create': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">إنشاء</span>;
            case 'update': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">تعديل</span>;
            case 'delete': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">حذف</span>;
            case 'restore': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">استعادة</span>;
            default: return log.action;
        }
    }

    function getEntityLabel(log: AuditLog) {
        if (log.entity_type === 'system') return 'النظام بالكامل';
        switch (log.entity_type) {
            case 'move': return 'قيد يومية';
            case 'account': return 'حساب محاسبي';
            case 'journal': return 'دفتر يومية';
            case 'partner': return 'شريك/جهة تعامل';
            case 'payment': return 'سند مالي';
            case 'invoice': return 'فاتورة';
            case 'payroll_detail': return 'تفاصيل راتب';
            default: return log.entity_type;
        }
    }

    function getDetailsContent(log: AuditLog) {
        if (log.entity_type === 'system') {
            try {
                const details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details as any);
                const actionText = details?.target_action === 'create' ? 'إنشاء' : details?.target_action === 'delete' ? 'حذف' : details?.target_action;
                const entityText = getEntityLabel({ entity_type: details?.target_entity_type } as any);
                return `تمت استعادة النظام إلى حالة ما بعد ${actionText} ${entityText}`;
            } catch (_e) {
                return "تمت استعادة حالة النظام";
            }
        }
        return JSON.stringify(log.details);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/accounting" className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="w-5 h-5" /></Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل الأحداث (Backlog)</h1>
                    <p className="text-gray-600">تتبع الحركات واستعادة المحذوفات</p>
                </div>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                {loading ? <div className="p-12 text-center">loading...</div> : (
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b font-medium text-gray-600">
                            <tr>
                                <th className="px-6 py-3">المستخدم</th>
                                <th className="px-6 py-3">الإجراء</th>
                                <th className="px-6 py-3">العنصر</th>
                                <th className="px-6 py-3">التفاصيل</th>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">{log.user_name}</td>
                                    <td className="px-6 py-4">{getActionLabel(log)}</td>
                                    <td className="px-6 py-4">{getEntityLabel(log)}</td>
                                    <td className="px-6 py-4 max-w-xs truncate text-gray-500">{getDetailsContent(log)}</td>
                                    <td className="px-6 py-4 text-gray-500 dir-ltr text-left">{new Date(log.created_at).toLocaleString('en-US')}</td>
                                    <td className="px-6 py-4">
                                        {log.entity_type === 'system' ? (
                                            <span className="text-gray-400 text-xs">عملية استعادة</span>
                                        ) : log.id === latestActualLogId ? (
                                            <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs font-semibold">الحالة الحالية</span>
                                        ) : log.id === lastRestoredLogId ? (
                                            <span className="text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs font-semibold">تمت الاستعادة هنا</span>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(log.id)}
                                                className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                                            >
                                                <RefreshCw className="w-3 h-3" /> استعادة النظام لهذه اللحظة
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
