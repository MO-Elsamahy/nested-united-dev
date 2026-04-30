"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Printer } from "lucide-react";
import Link from "next/link";

interface TrialBalanceRow {
    id: string;
    code: string;
    name: string;
    total_debit: number;
    total_credit: number;
    balance: number;
}

export default function TrialBalancePage() {
    const [data, setData] = useState<TrialBalanceRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams();
            if (from) p.set("from", from);
            if (to) p.set("to", to);
            const res = await fetch(`/api/accounting/reports/trial-balance?${p}`);
            if (res.ok) {
                const json = await res.json() as TrialBalanceRow[];
                setData(Array.isArray(json) ? json : []);
            }
        } catch (e: unknown) {
            console.error(e);
        } finally { setLoading(false); }
    }, [from, to]);

    useEffect(() => { void fetchReport(); }, [fetchReport]);

    const totalDebit = data.reduce((sum, r) => sum + r.total_debit, 0);
    const totalCredit = data.reduce((sum, r) => sum + r.total_credit, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="w-5 h-5" /></Link>
                    <h1 className="text-2xl font-bold">ميزان المراجعة</h1>
                </div>
                <button onClick={() => window.print()} className="bg-white border text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50">
                    <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-end print:hidden">
                <div><label className="block text-sm mb-1">من</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border rounded-md p-2 text-sm" /></div>
                <div><label className="block text-sm mb-1">إلى</label><input type="date" value={to} onChange={e => setTo(e.target.value)} className="border rounded-md p-2 text-sm" /></div>
                <button onClick={fetchReport} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700">تحديث</button>
            </div>

            <div className="bg-white border rounded-xl overflow-hidden print:border-none">
                <div className="p-8 text-center hidden print:block">
                    <h2 className="text-2xl font-bold">تقرير ميزان المراجعة</h2>
                    <p className="text-gray-500">من {from || "البداية"} إلى {to || "الآن"}</p>
                </div>

                {loading ? <div className="p-12 text-center text-gray-400">تحميل...</div> : (
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-3">الكود</th>
                                <th className="px-6 py-3">الحساب</th>
                                <th className="px-6 py-3">مدين</th>
                                <th className="px-6 py-3">دائن</th>
                                <th className="px-6 py-3">الصافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map(r => (
                                <tr key={r.id}>
                                    <td className="px-6 py-3 font-mono text-gray-500">{r.code}</td>
                                    <td className="px-6 py-3 font-medium">{r.name}</td>
                                    <td className="px-6 py-3 text-gray-600">{r.total_debit?.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-gray-600">{r.total_credit?.toLocaleString()}</td>
                                    <td className={`px-6 py-3 font-bold dir-ltr ${r.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{Math.abs(r.balance).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold border-t">
                            <tr>
                                <td colSpan={2} className="px-6 py-4 text-center">الإجمالي</td>
                                <td className="px-6 py-4 text-blue-800">{totalDebit.toLocaleString()}</td>
                                <td className="px-6 py-4 text-blue-800">{totalCredit.toLocaleString()}</td>
                                <td className="px-6 py-4">{Math.abs(totalDebit - totalCredit) < 0.1 ? <span className="text-green-600">متزن ✅</span> : <span className="text-red-600">غير متزن ❌</span>}</td>
                            </tr>
                        </tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
