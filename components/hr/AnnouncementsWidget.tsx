"use client";

import { useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { AnnouncementModal } from "@/components/hr/AnnouncementModal";

interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: string;
    is_pinned?: boolean | number;
    published_at: string | null;
    created_by_name?: string;
}

interface AnnouncementsWidgetProps {
    announcements: Announcement[];
}

export function AnnouncementsWidget({ announcements }: AnnouncementsWidgetProps) {
    const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);

    if (announcements.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p>لا توجد إعلانات</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {announcements.map((ann) => (
                    <div
                        key={ann.id}
                        onClick={() => setSelectedAnn(ann)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedAnn(ann)}
                        aria-label={`عرض إعلان: ${ann.title}`}
                        className={`p-4 rounded-xl border-r-4 cursor-pointer group transition hover:shadow-sm ${
                            ann.priority === "urgent"
                                ? "bg-red-50 border-red-500 hover:bg-red-100"
                                : ann.priority === "high"
                                    ? "bg-orange-50 border-orange-500 hover:bg-orange-100"
                                    : "bg-gray-50 border-violet-300 hover:bg-violet-50"
                        }`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 group-hover:text-violet-700 transition leading-snug">
                                    {ann.title}
                                </h3>
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{ann.content}</p>
                                <p className="text-gray-400 text-xs mt-2">
                                    {ann.published_at && new Date(ann.published_at).toLocaleDateString("ar-SA")}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                {ann.is_pinned && (
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Pin className="w-3 h-3" />
                                        مثبت
                                    </span>
                                )}
                                <span className="text-violet-500 text-xs opacity-0 group-hover:opacity-100 transition whitespace-nowrap mt-1">
                                    اقرأ المزيد ←
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <AnnouncementModal
                announcement={selectedAnn}
                onClose={() => setSelectedAnn(null)}
            />
        </>
    );
}
