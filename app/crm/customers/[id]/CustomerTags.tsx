"use client";

import { useState, useEffect } from "react";
import { Tag, Plus, X } from "lucide-react";

interface CRMTag {
    id: string;
    name: string;
    color: string;
    text_color: string;
}

export default function CustomerTags({ customerId }: { customerId: string }) {
    const [tags, setTags] = useState<CRMTag[]>([]);
    const [allTags, setAllTags] = useState<CRMTag[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);

    useEffect(() => {
        fetchTags();
        fetchAllTags();
    }, [customerId]);

    const fetchTags = async () => {
        try {
            const res = await fetch(`/api/crm/customer-tags?customer_id=${customerId}`);
            const data = await res.json();
            setTags(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchAllTags = async () => {
        try {
            const res = await fetch('/api/crm/tags');
            const data = await res.json();
            setAllTags(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddTag = async (tagId: string) => {
        try {
            await fetch('/api/crm/customer-tags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: customerId, tag_id: tagId })
            });
            fetchTags();
            setShowAddMenu(false);
        } catch (e) {
            alert('فشل إضافة التصنيف');
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        try {
            await fetch(`/api/crm/customer-tags?customer_id=${customerId}&tag_id=${tagId}`, {
                method: 'DELETE'
            });
            fetchTags();
        } catch (e) {
            alert('فشل حذف التصنيف');
        }
    };

    const availableTags = allTags.filter(tag => !tags.find(t => t.id === tag.id));

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
                        onClick={() => handleRemoveTag(tag.id)}
                        className="opacity-0 group-hover:opacity-100 transition"
                    >
                        <X className="w-3 h-3 text-red-600" />
                    </button>
                </div>
            ))}

            {/* Add Tag Button */}
            <div className="relative">
                <button
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
                                key={tag.id}
                                onClick={() => handleAddTag(tag.id)}
                                className={`w-full px-3 py-2 rounded-lg text-right hover:bg-gray-50 transition flex items-center gap-2 ${tag.text_color}`}
                            >
                                <div className={`w-3 h-3 rounded-full ${tag.color.replace('bg-', 'bg-')}`}></div>
                                {tag.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
