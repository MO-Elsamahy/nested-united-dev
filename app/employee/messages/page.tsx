"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, AlertTriangle, FileWarning, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function EmployeeMessagesPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hr/messages?scope=self");
            const data = await res.json();
            setMessages(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const markAsRead = async (id: string, currentlyRead: boolean) => {
        if (currentlyRead) return;

        try {
            const res = await fetch(`/api/hr/messages/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_read: true })
            });
            if (res.ok) {
                setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: 1 } : m));
            }
        } catch (error) {
            console.error("Failed to mark as read");
        }
    };

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
            <div className="flex items-center gap-4">
                <Link href="/employee" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">رسائل الإدارة</h1>
                    <p className="text-gray-500">الإنذارات والملاحظات الإدارية الموجهة إليك</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    </div>
                ) : messages.length > 0 ? (
                    <div className="divide-y">
                        {messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`p-6 transition ${msg.is_read ? 'bg-white' : 'bg-violet-50/50 hover:bg-violet-50'} cursor-pointer`}
                                onClick={() => markAsRead(msg.id, msg.is_read)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            msg.message_type === "notice" ? "bg-blue-100 text-blue-600" :
                                            msg.message_type === "warning" ? "bg-orange-100 text-orange-600" :
                                            "bg-red-100 text-red-600"
                                        }`}>
                                            {getTypeIcon(msg.message_type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className={`text-lg ${msg.is_read ? 'font-semibold text-gray-800' : 'font-bold text-gray-900'}`}>
                                                    {msg.title}
                                                </h3>
                                                {!msg.is_read && (
                                                    <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">جديد</span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                                                <span>{getTypeLabel(msg.message_type)}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{new Date(msg.created_at).toLocaleDateString("ar-SA")}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>من: {msg.sender_name || 'الإدارة'}</span>
                                            </div>

                                            <div className="bg-gray-50 border rounded-lg p-4 text-gray-700 leading-relaxed">
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block">
                                        {msg.is_read ? (
                                            <span className="flex items-center gap-1 text-sm text-gray-400">
                                                <Eye className="w-4 h-4" />
                                                مقروءة
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-sm text-violet-600 font-medium">
                                                <EyeOff className="w-4 h-4" />
                                                غير مقروءة
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">لا يوجد رسائل إدارية</h3>
                        <p className="text-gray-500">سجلك نظيف! لا توجد إنذارات أو لفت نظر.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
