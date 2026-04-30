
"use client";

import { useState, useEffect, useCallback } from "react";
import {
    CheckCircle,
    XCircle,
    FileText,
    Calendar,
    Loader2,
    Trash2
} from "lucide-react";

interface HRRequest {
    id: string;
    employee_id: string;
    full_name: string;
    job_title?: string;
    department?: string;
    request_type: string;
    start_date: string;
    end_date?: string;
    days_count: number;
    reason?: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

export default function HRRequestsPage() {
    const [requests, setRequests] = useState<HRRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("pending");
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/requests?status=${statusFilter}`);
            const data = await res.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleAction = async (id: string, action: "approved" | "rejected") => {
        if (!confirm(action === "approved" ? "هل أنت متأكد من قبول الطلب؟" : "هل أنت متأكد من رفض الطلب؟")) return;

        setProcessingId(id);
        const notes = prompt("ملاحظات (اختياري):");

        try {
            const res = await fetch(`/api/hr/requests/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: action, reviewer_notes: notes || "" }),
            });

            if (res.ok) {
                // Refresh list
                fetchRequests();
            } else {
                alert("حدث خطأ");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الاتصال");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا الطلب نهائياً من قاعدة البيانات؟")) return;
        
        setProcessingId(id);
        try {
            const res = await fetch(`/api/hr/requests/${id}`, {
                method: "DELETE"
            });

            if (res.ok) {
                fetchRequests();
            } else {
                alert("حدث خطأ أثناء الحذف");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الاتصال");
        } finally {
            setProcessingId(null);
        }
    };

    const getRequestType = (type: string) => {
        const types: Record<string, string> = {
            annual_leave: "إجازة سنوية",
            sick_leave: "إجازة مرضية",
            unpaid_leave: "إجازة بدون راتب",
            shift_swap: "تبديل شيفت",
            overtime: "إضافي",
            other: "أخرى",
        };
        return types[type] || type;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة الطلبات</h1>
                    <p className="text-gray-500">مراجعة واعتماد طلبات الموظفين</p>
                </div>

                {/* Filter */}
                <div className="flex bg-white rounded-lg shadow-sm border p-1">
                    {["pending", "approved", "rejected"].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === s
                                    ? "bg-violet-100 text-violet-700"
                                    : "text-gray-500 hover:text-gray-900"
                                }`}
                        >
                            {s === "pending" && "قيد الانتظار"}
                            {s === "approved" && "المقبولة"}
                            {s === "rejected" && "المرفوضة"}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-violet-600" />
                        <p className="mt-2 text-gray-500">جاري التحميل...</p>
                    </div>
                ) : requests.length > 0 ? (
                    requests.map((req) => (
                        <div key={req.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">

                            {/* Info */}
                            <div className="flex items-start gap-4 flex-1">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-lg">
                                    {req.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{req.full_name}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{req.job_title} - {req.department}</p>

                                    <div className="flex flex-wrap gap-3 items-center">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${req.request_type.includes('leave') ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                                            }`}>
                                            {getRequestType(req.request_type)}
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(req.start_date).toLocaleDateString("ar-SA")}
                                        </span>
                                        {req.days_count > 0 && (
                                            <span className="text-sm text-gray-400">({req.days_count} يوم)</span>
                                        )}
                                    </div>

                                    {req.reason && (
                                        <p className="mt-3 text-gray-700 bg-gray-50 p-3 rounded-lg text-sm border">
                                            {req.reason}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {req.status === "pending" ? (
                                    <>
                                        <button
                                            onClick={() => handleAction(req.id, "approved")}
                                            disabled={processingId === req.id}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
                                        >
                                            {processingId === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                            <span>قبول</span>
                                        </button>
                                        <button
                                            onClick={() => handleAction(req.id, "rejected")}
                                            disabled={processingId === req.id}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition disabled:opacity-50"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>رفض</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm ${req.status === "approved" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                        }`}>
                                        {req.status === "approved" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                        <span>{req.status === "approved" ? "تم القبول" : "تم الرفض"}</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => handleDelete(req.id)}
                                    disabled={processingId === req.id}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                    title="حذف الطلب"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-16 text-gray-500 bg-white rounded-xl border border-dashed">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>لا توجد طلبات في هذه القائمة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
