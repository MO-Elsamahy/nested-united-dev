"use client";

import { useState, useEffect } from "react";
import { History, RefreshCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AuditLog {
    id: string;
    user_name: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: any;
    created_at: string;
}

export default function BacklogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            const res = await fetch("/api/accounting/audit");
            if (res.ok) setLogs(await res.json());
        } finally {
            setLoading(false);
        }
    }

    async function handleRestore(type: string, id: string) {
        if (!confirm("هل أنت متأكد من استعادة هذا العنصر؟")) return;
        try {
            const res = await fetch(`/api/accounting/restore?type=${type}&id=${id}`, { method: "POST" });
            if (res.ok) {
                alert("تمت الاستعادة بنجاح");
                fetchLogs();
            } else {
                alert("فشل الاستعادة");
            }
        } catch (e) {
            alert("حدث خطأ");
        }
    }

    function getActionLabel(action: string) {
        switch (action) {
            case 'create': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">إنشاء</span>;
            case 'update': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">تعديل</span>;
            case 'delete': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">حذف</span>;
            case 'restore': return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">استعادة</span>;
            default: return action;
        }
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
                                    <td className="px-6 py-4">{getActionLabel(log.action)}</td>
                                    <td className="px-6 py-4">{log.entity_type}</td>
                                    <td className="px-6 py-4 max-w-xs truncate text-gray-500">{JSON.stringify(log.details)}</td>
                                    <td className="px-6 py-4 text-gray-500 dir-ltr text-left">{new Date(log.created_at).toLocaleString('en-US')}</td>
                                    <td className="px-6 py-4">
                                        {log.action === 'delete' && (
                                            <button
                                                onClick={() => handleRestore(log.entity_type, log.entity_id)}
                                                className="flex items-center gap-1 text-blue-600 hover:underline"
                                            >
                                                <RefreshCw className="w-3 h-3" /> استعادة
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
