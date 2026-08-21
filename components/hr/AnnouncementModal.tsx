"use client";

import { useEffect } from "react";
import { X, Megaphone, Calendar, Pin, AlertTriangle } from "lucide-react";

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    is_pinned?: boolean | number;
    published_at: string | null;
    created_by_name?: string;
}

interface AnnouncementModalProps {
    announcement: Announcement | null;
    onClose: () => void;
}

export function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (announcement) {
            document.addEventListener("keydown", handleKey);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
        };
    }, [announcement, onClose]);

    if (!announcement) return null;

    const priorityConfig = {
        urgent: {
            badge: "bg-red-100 text-red-700 border-red-200",
            border: "border-t-4 border-red-500",
            icon: <AlertTriangle className="w-4 h-4" />,
            label: "عاجل",
        },
        high: {
            badge: "bg-orange-100 text-orange-700 border-orange-200",
            border: "border-t-4 border-orange-500",
            icon: <AlertTriangle className="w-4 h-4" />,
            label: "مهم",
        },
        normal: {
            badge: "bg-blue-100 text-blue-700 border-blue-200",
            border: "border-t-4 border-violet-500",
            icon: <Megaphone className="w-4 h-4" />,
            label: "عادي",
        },
    };

    const cfg = priorityConfig[announcement.priority as keyof typeof priorityConfig] ?? priorityConfig.normal;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
        >
            <div className={`bg-white rounded-2xl shadow-2xl max-w-lg w-full text-right overflow-hidden animate-in zoom-in-95 duration-200 ${cfg.border}`}>
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4">
                    <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Megaphone className="w-5 h-5 text-violet-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                                    {cfg.icon}
                                    {cfg.label}
                                </span>
                                {announcement.is_pinned && (
                                    <span className="inline-flex items-center gap-1 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                        <Pin className="w-3 h-3" />
                                        مثبت
                                    </span>
                                )}
                            </div>
                            <h2 className="text-lg font-bold text-gray-900 leading-snug">
                                {announcement.title}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition shrink-0 mr-2"
                        aria-label="إغلاق"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-100 mx-6" />

                {/* Content */}
                <div className="p-6 pt-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                        {announcement.content}
                    </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {announcement.published_at
                            ? new Date(announcement.published_at).toLocaleDateString("ar-SA", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })
                            : "—"}
                    </div>
                    {announcement.created_by_name && (
                        <span>بواسطة: {announcement.created_by_name}</span>
                    )}
                </div>

                {/* Close button */}
                <div className="px-6 pb-5">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 bg-gray-900 hover:bg-gray-700 text-white rounded-xl font-medium transition text-sm"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
}
