"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, GripVertical, AlertCircle, DollarSign, Calendar, Archive, RotateCcw, Filter } from "lucide-react";

const STAGES = [
    { id: 'new', label: 'جديد', color: 'bg-gray-100 border-gray-200' },
    { id: 'contacting', label: 'جاري التواصل', color: 'bg-blue-50 border-blue-100' },
    { id: 'proposal', label: 'إرسال عرض', color: 'bg-purple-50 border-purple-100' },
    { id: 'negotiation', label: 'تفاوض', color: 'bg-yellow-50 border-yellow-100' },
    { id: 'won', label: 'تم الاتفاق', color: 'bg-green-50 border-green-100' },
    { id: 'paid', label: 'تم الدفع', color: 'bg-teal-50 border-teal-100' },
    { id: 'completed', label: 'مكتمل', color: 'bg-emerald-50 border-emerald-100' },
    { id: 'lost', label: 'خسارة / ملغى', color: 'bg-red-50 border-red-100' },
];

export default function KanbanPage() {
    const [deals, setDeals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
    const [draggingId, setDraggingId] = useState<string | null>(null);

    useEffect(() => {
        fetchDeals();
    }, [statusFilter]);

    const fetchDeals = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/deals?status=${statusFilter}`);
            const data = await res.json();
            setDeals(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.setData("dealId", id);
    };

    const handleDrop = async (e: React.DragEvent, newStage: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("dealId");

        if (!id) return;

        // Optimistic update
        setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: newStage } : d));
        setDraggingId(null);

        try {
            await fetch("/api/crm/deals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, stage: newStage })
            });
        } catch (error) {
            alert("فشل تحديث الحالة");
            fetchDeals(); // Revert on error
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'open' ? 'closed' : 'open';
        const confirmMsg = newStatus === 'closed'
            ? "هل أنت متأكد من إغلاق هذه الصفقة؟ ستتم أرشفتها في حالتها الحالية."
            : "هل تريد إعادة فتح الصفقة واستكمال العمل عليها؟";

        if (!confirm(confirmMsg)) return;

        // Optimistic Remove/Add
        setDeals(prev => prev.filter(d => d.id !== id));

        try {
            await fetch("/api/crm/deals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus })
            });
            fetchDeals(); // Refresh to ensure sync
        } catch (error) {
            alert("حدث خطأ");
            fetchDeals();
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">لوحة الصفقات (Pipeline)</h1>
                    <p className="text-gray-500">تتبع مسار الصفقات والمبيعات</p>
                </div>

                {/* Filters */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setStatusFilter('open')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'open' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        المفتوحة (Jary)
                    </button>
                    <button
                        onClick={() => setStatusFilter('closed')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${statusFilter === 'closed' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        الأرشيف (Closed)
                    </button>
                </div>

                <Link
                    href="/crm/deals/new"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>صفقة جديدة</span>
                </Link>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-gray-500 flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        جاري تحميل الصفقات...
                    </div>
                </div>
            ) : (
                /* Kanban Board */
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-4 min-w-[1200px] h-full">
                        {STAGES.map(stage => (
                            <div
                                key={stage.id}
                                className={`flex-1 min-w-[280px] rounded-xl flex flex-col h-full bg-slate-50 border border-slate-200`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {/* Column Header */}
                                <div className={`p-4 font-bold text-gray-700 border-b flex justify-between items-center ${stage.color} bg-opacity-50`}>
                                    <span>{stage.label}</span>
                                    <span className="text-xs bg-white px-2 py-0.5 rounded shadow-sm">
                                        {deals.filter(d => d.stage === stage.id).length}
                                    </span>
                                </div>

                                {/* Cards Container */}
                                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                    {deals.filter(d => d.stage === stage.id).map(deal => (
                                        <div
                                            key={deal.id}
                                            draggable={statusFilter === 'open'}
                                            onDragStart={(e) => handleDragStart(e, deal.id)}
                                            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-100 group hover:shadow-md transition ${statusFilter === 'open' ? 'cursor-move active:cursor-grabbing' : 'opacity-75'
                                                } ${draggingId === deal.id ? 'opacity-50' : ''}`}
                                        >
                                            <div className="mb-2 flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 line-clamp-2">{deal.title}</h4>
                                                    <p className="text-sm text-gray-500">{deal.customer_name}</p>
                                                </div>
                                                {/* Action Button */}
                                                <button
                                                    onClick={() => handleToggleStatus(deal.id, statusFilter)}
                                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title={statusFilter === 'open' ? "إغلاق/أرشفة الصفقة" : "إعادة فتح الصفقة"}
                                                >
                                                    {statusFilter === 'open' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 text-xs text-gray-500 border-t pt-2">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-400"># {deal.id.substring(0, 6)}</span>
                                                </div>
                                                {deal.priority === 'high' && (
                                                    <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">عاجل</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {deals.filter(d => d.stage === stage.id).length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 text-gray-300 select-none">
                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-200 mb-2" />
                                            <p className="text-xs">لا توجد صفقات</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
