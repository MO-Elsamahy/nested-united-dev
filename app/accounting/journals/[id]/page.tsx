"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowRight, Plus, FileText, CheckCircle, Clock, Trash2 } from "lucide-react";
import { AccountingMove } from "@/lib/types/accounting";
import { useCallback } from "react";
import Link from "next/link";

export default function JournalEntriesPage() {
    const { id } = useParams();
    const [moves, setMoves] = useState<AccountingMove[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMoves = useCallback(async () => {
        try {
            const res = await fetch(`/api/accounting/moves?journal_id=${id}`);
            if (res.ok) setMoves(await res.json());
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) void fetchMoves();
    }, [id, fetchMoves]);

    const getStatus = (state: string) => {
        if (state === "posted") return <span className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs font-medium"><CheckCircle className="w-3 h-3" /> مرحّل</span>;
        if (state === "draft") return <span className="flex items-center gap-1 text-gray-700 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium"><Clock className="w-3 h-3" /> مسودة</span>;
        return <span className="text-red-700 bg-red-100 px-2 py-1 rounded-full text-xs font-medium">ملغى</span>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/journals" className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">قيود اليومية</h1>
                        <p className="text-gray-600">تفاصيل الدفتر</p>
                    </div>
                </div>
                <Link href={`/accounting/moves/create?journal_id=${id}`} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
                    <Plus className="w-4 h-4" /> <span>قيد جديد</span>
                </Link>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
                ) : moves.length === 0 ? (
                    <div className="p-16 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">لا توجد قيود مسجلة في هذا الدفتر.</p>
                    </div>
                ) : (
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 text-gray-500 text-sm font-semibold border-b">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">المرجع</th>
                                <th className="px-6 py-3">البيان</th>
                                <th className="px-6 py-3">الشريك</th>
                                <th className="px-6 py-3">القيمة</th>
                                <th className="px-6 py-3">الحالة</th>
                                <th className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-sm">
                            {moves.map(move => (
                                <tr key={move.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4">{move.date}</td>
                                    <td className="px-6 py-4 font-mono text-gray-600">{move.ref || "-"}</td>
                                    <td className="px-6 py-4 max-w-xs truncate">{move.narration || "-"}</td>
                                    <td className="px-6 py-4">{move.partner_name || "-"}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{Number(move.amount_total).toFixed(2)}</td>
                                    <td className="px-6 py-4">{getStatus(move.state)}</td>
                                    <td className="px-6 py-4 text-left flex items-center gap-2 justify-end">
                                        <button
                                            onClick={() => {
                                                if (confirm('حذف هذا القيد؟ سيتم نقله إلى سلة المحذوفات (Backlog).')) {
                                                    fetch(`/api/accounting/moves?id=${move.id}`, { method: 'DELETE' }).then(() => fetchMoves());
                                                }
                                            }}
                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <Link
                                            href={`/accounting/moves/${move.id}`}
                                            className="text-blue-600 hover:underline text-xs shrink-0"
                                        >
                                            عرض
                                        </Link>
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
