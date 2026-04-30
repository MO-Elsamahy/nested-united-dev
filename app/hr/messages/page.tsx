"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, MessageSquare, AlertTriangle, FileWarning, Eye, Trash2, EyeOff, Loader2 } from "lucide-react";

interface HRMessage {
    id: string;
    title: string;
    content: string;
    message_type: "notice" | "warning" | "violation";
    employee_name: string;
    department?: string;
    job_title?: string;
    is_read: boolean | number;
    created_at: string;
}

export default function HRMessagesPage() {
    const [messages, setMessages] = useState<HRMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hr/messages${filterType ? `?type=${filterType}` : ""}`);
            const data = await res.json();
            setMessages(Array.isArray(data) ? data : []);
        } catch (error: unknown) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [filterType]);

    useEffect(() => {
        fetchMessages();
    }, [fetchMessages]);

    const handleDelete = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذه الرسالة نهائياً؟")) return;

        try {
            const res = await fetch(`/api/hr/messages/${id}`, { method: "DELETE" });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== id));
            } else {
                alert("حدث خطأ أثناء الحذف");
            }
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : "فشل الاتصال");
        }
    };

    const filteredMessages = messages.filter(m => 
        m.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "notice": return <MessageSquare className="w-5 h-5 text-blue-600" />;
            case "warning": return <AlertTriangle className="w-5 h-5 text-orange-600" />;
            case "violation": return <FileWarning className="w-5 h-5 text-red-600" />;
            default: return <MessageSquare className="w-5 h-5" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "notice": return "لفت نظر";
            case "warning": return "تنبيه";
            case "violation": return "مخالفة";
            default: return type;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">رسائل الإدارة (الإنذارات)</h1>
                    <p className="text-gray-500">متابعة لفت النظر والتنبيهات والمخالفات الموجهة للموظفين</p>
                </div>
                <Link
                    href="/hr/messages/new"
                    className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl transition shadow-lg shadow-violet-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>إرسال رسالة جديدة</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="ابحث باسم الموظف أو عنوان الرسالة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500"
                    />
                </div>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-violet-500 w-full md:w-auto"
                >
                    <option value="">جميع الأنواع</option>
                    <option value="notice">لفت نظر</option>
                    <option value="warning">تنبيه</option>
                    <option value="violation">مخالفة</option>
                </select>
            </div>

            {/* List */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : filteredMessages.length > 0 ? (
                    <div className="divide-y overflow-x-auto">
                        <table className="w-full text-right whitespace-nowrap">
                            <thead className="bg-gray-50 text-gray-500 text-sm">
                                <tr>
                                    <th className="px-6 py-4 font-medium">الرسالة</th>
                                    <th className="px-6 py-4 font-medium">الموظف المستلم</th>
                                    <th className="px-6 py-4 font-medium">النوع</th>
                                    <th className="px-6 py-4 font-medium">التاريخ والحالة</th>
                                    <th className="px-6 py-4 font-medium text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 max-w-xs truncate" title={msg.title}>{msg.title}</p>
                                            <p className="text-gray-500 text-sm truncate max-w-xs" title={msg.content}>{msg.content}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                                                    {msg.employee_name?.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{msg.employee_name}</p>
                                                    <p className="text-xs text-gray-500">{msg.department} - {msg.job_title}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                                                msg.message_type === "notice" ? "bg-blue-50 text-blue-700" :
                                                msg.message_type === "warning" ? "bg-orange-50 text-orange-700" :
                                                "bg-red-50 text-red-700"
                                            }`}>
                                                {getTypeIcon(msg.message_type)}
                                                <span>{getTypeLabel(msg.message_type)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {new Date(msg.created_at).toLocaleDateString("ar-SA")}
                                                </span>
                                                {msg.is_read ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                        <Eye className="w-3 h-3" />
                                                        مقروءة
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-gray-400">
                                                        <EyeOff className="w-3 h-3" />
                                                        غير مقروءة
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="حذف الرسالة"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد رسائل</h3>
                        <p className="text-gray-500">لم تقم بإرسال أي إنذارات أو لفت نظر بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
