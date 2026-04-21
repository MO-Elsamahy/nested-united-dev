"use client";

import { useState, useEffect, useRef } from "react";
import { Tag, Plus, X } from "lucide-react";
import type { CRMTag } from "@/lib/types/crm";

export default function CustomerTags({ customerId }: { customerId: string }) {
    const [tags, setTags] = useState<CRMTag[]>([]);
    const [allTags, setAllTags] = useState<CRMTag[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTags();
        fetchAllTags();
    }, [customerId]);

    useEffect(() => {
        if (!showAddMenu) return;
        const onDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowAddMenu(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setShowAddMenu(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [showAddMenu]);

    const fetchTags = async () => {
        try {
            const res = await fetch(`/api/crm/customer-tags?customer_id=${customerId}`);
            const data = await res.json();
            if (!res.ok) return;
            setTags(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllTags = async () => {
        try {
            const res = await fetch("/api/crm/tags");
            const data = await res.json();
            if (!res.ok) return;
            setAllTags(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddTag = async (tagId: string) => {
        try {
            const res = await fetch("/api/crm/customer-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id: customerId, tag_id: tagId }),
            });
            if (!res.ok) {
                alert("تعذّر إضافة التصنيف");
                return;
            }
            fetchTags();
            setShowAddMenu(false);
        } catch {
            alert("تعذّر إضافة التصنيف");
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            const res = await fetch(`/api/crm/customer-tags?customer_id=${customerId}&tag_id=${tagId}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                alert("تعذّر حذف التصنيف");
                return;
            }
            fetchTags();
        } catch {
            alert("تعذّر حذف التصنيف");
        }
    };

    const availableTags = allTags.filter((tag) => !tags.find((t) => t.id === tag.id));

    return (
        <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tag) => (
                <div
                    key={tag.id}
                    className={`px-3 py-1 rounded-full border flex items-center gap-2 group ${tag.color}`}
                >
                    <Tag className={`w-3 h-3 ${tag.text_color}`} />
                    <span className={`text-sm font-medium ${tag.text_color}`}>{tag.name}</span>
                    <button
                        type="button"
                        onClick={() => handleRemoveTag(tag.id)}
                        className="opacity-0 group-hover:opacity-100 transition"
                    >
                        <X className="w-3 h-3 text-red-600" />
                    </button>
                </div>
            ))}

            <div className="relative" ref={menuRef}>
                <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="px-3 py-1 rounded-full border border-dashed border-gray-300 hover:border-blue-500 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition"
                >
                    <Plus className="w-3 h-3" />
                    <span className="text-sm">تصنيف</span>
                </button>

                {showAddMenu && availableTags.length > 0 && (
                    <div className="absolute top-full mt-2 bg-white border rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                        {availableTags.map((tag) => (
                            <button
                                type="button"
                                key={tag.id}
                                onClick={() => handleAddTag(tag.id)}
                                className={`w-full px-3 py-2 rounded-lg text-right hover:bg-gray-50 transition flex items-center gap-2 ${tag.text_color}`}
                            >
                                <span className={`w-3 h-3 rounded-full shrink-0 ${tag.color}`} aria-hidden />
                                {tag.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
