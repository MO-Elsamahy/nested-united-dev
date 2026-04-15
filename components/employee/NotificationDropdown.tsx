"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, MessageSquare, FileText, Clock, ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Notification {
    id: string;
    title: string;
    type: "message" | "request";
    created_at: string;
    is_read: number;
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/hr/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Refresh every 2 minutes
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, []);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => n.type === 'message' && n.is_read === 0).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-all duration-300 ${
                    isOpen ? "bg-violet-100 text-violet-700 shadow-inner" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? "animate-swing" : ""}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-3 w-80 bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 origin-top-left">
                    <div className="p-4 border-b border-gray-100/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900">التنبيهات</h3>
                        <Link href="/employee/messages" className="text-xs text-violet-600 hover:underline" onClick={() => setIsOpen(false)}>
                            عرض الكل
                        </Link>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <Clock className="w-8 h-8 text-gray-300 animate-spin mx-auto mb-2" />
                                <p className="text-sm text-gray-400 font-medium">جاري التحميل...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <Link
                                        key={notif.id}
                                        href={notif.type === 'message' ? "/employee/messages" : "/employee/requests"}
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-start gap-3 p-4 hover:bg-violet-50/50 transition-colors group"
                                    >
                                        <div className={`mt-1 p-2 rounded-lg ${
                                            notif.type === 'message' ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                                        }`}>
                                            {notif.type === 'message' ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={`text-sm leading-snug ${notif.type === 'message' && notif.is_read === 0 ? "font-bold text-gray-900" : "text-gray-600"}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(notif.created_at).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <ChevronLeft className="w-3 h-3 text-gray-300 group-hover:text-violet-400 transition-colors mt-auto mb-auto" />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-12 text-center">
                                <Bell className="w-12 h-12 text-gray-100 mx-auto mb-3" />
                                <p className="text-sm text-gray-400">لا توجد تنبيهات جديدة</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-gray-400">يتم تحديث التنبيهات تلقائياً</p>
                    </div>
                </div>
            )}
        </div>
    );
}
