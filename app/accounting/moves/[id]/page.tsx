"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Loader2 } from "lucide-react";
import { AccountingMove, AccountingMoveLine } from "@/lib/types/accounting";

export default function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [data, setData] = useState<{ move: AccountingMove; lines: AccountingMoveLine[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/accounting/moves/${id}`);
                const json = await res.json();
                if (!res.ok) {
                    if (!cancelled) setErr(json.error || "تعذر التحميل");
                    return;
                }
                if (!cancelled) setData({ move: json.move, lines: json.lines || [] });
            } catch (error: unknown) {
                if (!cancelled) setErr(error instanceof Error ? error.message : "فشل الاتصال");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري التحميل...
            </div>
        );
    }

    if (err || !data?.move) {
        return (
            <div className="space-y-4">
                <Link href="/accounting/journals" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <ArrowRight className="w-4 h-4" />
                    العودة لدفاتر اليومية
                </Link>
                <p className="text-red-600">{err || "القيد غير موجود"}</p>
            </div>
        );
    }

    const { move, lines } = data;
    const backHref = move.journal_id ? `/accounting/journals/${move.journal_id}` : "/accounting/journals";

    const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href={backHref} className="p-2 hover:bg-slate-100 rounded-full shrink-0">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">تفاصيل القيد</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {move.journal_name ? (
                                <>
                                    {move.journal_name}
                                    {move.journal_code ? ` (${move.journal_code})` : ""}
                                </>
                            ) : (
                                "دفتر اليومية"
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block mb-1">التاريخ</span>
                        <span className="font-medium">{move.date || "—"}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block mb-1">المرجع</span>
                        <span className="font-mono">{move.ref || "—"}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block mb-1">الحالة</span>
                        <span className="font-medium">{move.state === "posted" ? "مرحّل" : move.state === "draft" ? "مسودة" : move.state || "—"}</span>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                        <span className="text-gray-500 block mb-1">البيان</span>
                        <span className="font-medium">{move.narration || "—"}</span>
                    </div>
                    {move.partner_name ? (
                        <div>
                            <span className="text-gray-500 block mb-1">الشريك</span>
                            <span>{move.partner_name}</span>
                        </div>
                    ) : null}
                    {move.created_by_name ? (
                        <div>
                            <span className="text-gray-500 block mb-1">أنشأه</span>
                            <span>{move.created_by_name}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b bg-gray-50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h2 className="font-semibold text-gray-800">أسطر القيد</h2>
                </div>
                {lines.length === 0 ? (
                    <p className="p-8 text-center text-gray-500 text-sm">لا توجد أسطر لهذا القيد.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-500 border-b">
                                <tr>
                                    <th className="px-4 py-3">الحساب</th>
                                    <th className="px-4 py-3">البيان</th>
                                    <th className="px-4 py-3">مدين</th>
                                    <th className="px-4 py-3">دائن</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {lines.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-gray-600">{row.account_code || "—"}</span>
                                            <span className="block text-gray-900">{row.account_name || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate">{row.name || "—"}</td>
                                        <td className="px-4 py-3 font-mono tabular-nums">
                                            {Number(row.debit) > 0 ? Number(row.debit).toFixed(2) : "—"}
                                        </td>
                                        <td className="px-4 py-3 font-mono tabular-nums">
                                            {Number(row.credit) > 0 ? Number(row.credit).toFixed(2) : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t font-semibold">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3 text-left">
                                        الإجمالي
                                    </td>
                                    <td className="px-4 py-3 font-mono tabular-nums">{totalDebit.toFixed(2)}</td>
                                    <td className="px-4 py-3 font-mono tabular-nums">{totalCredit.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
