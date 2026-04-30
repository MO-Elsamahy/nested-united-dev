"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Printer } from "lucide-react";
import Link from "next/link";
import { AccountingAccount } from "@/lib/types/accounting";

interface GLMove {
    date: string;
    ref: string;
    line_name?: string;
    move_narration: string;
    partner_name?: string;
    debit: number;
    credit: number;
    running_balance: number;
}

interface GLData {
    opening_balance: number;
    moves: GLMove[];
}

export default function GeneralLedgerPage() {
    const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
    const [selectedAccount, setSelectedAccount] = useState("");
    const [data, setData] = useState<GLData | null>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    useEffect(() => {
        fetch("/api/accounting/accounts")
            .then(r => r.json())
            .then(data => setAccounts(Array.isArray(data) ? data : []));
    }, []);

    const fetchReport = useCallback(async () => {
        if (!selectedAccount) return;
        setLoading(true);
        try {
            const p = new URLSearchParams();
            p.set("account_id", selectedAccount);
            if (from) p.set("from", from);
            if (to) p.set("to", to);
            const res = await fetch(`/api/accounting/reports/general-ledger?${p}`);
            if (res.ok) setData(await res.json() as GLData);
        } catch (e: unknown) {
            console.error(e);
        } finally { setLoading(false); }
    }, [selectedAccount, from, to]);

    const selectedAccountName = accounts.find(a => a.id === selectedAccount)?.name || "";

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="w-5 h-5" /></Link>
                    <h1 className="text-2xl font-bold">دفتر الأستاذ (General Ledger)</h1>
                </div>
                <button onClick={() => window.print()} className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                    <Printer className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm print:hidden grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1">الحساب</label>
                    <select
                        value={selectedAccount}
                        onChange={e => setSelectedAccount(e.target.value)}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="">اختر الحساب...</option>
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">من</label>
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-full border rounded-lg p-2" />
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-sm font-medium mb-1">إلى</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-full border rounded-lg p-2" />
                    </div>
                    <button 
                        onClick={fetchReport} 
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-[1px] h-[42px] disabled:bg-blue-300"
                    >
                        {loading ? "جاري..." : "عرض"}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}

            {data && (
                <div className="bg-white border rounded-xl overflow-hidden print:border-none">
                    <div className="p-8 pb-4 text-center hidden print:block">
                        <h2 className="text-xl font-bold">دفتر الأستاذ العام</h2>
                        <p>الحساب: {selectedAccountName}</p>
                        <p className="text-sm text-gray-500">{from} - {to}</p>
                    </div>

                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">المرجع</th>
                                <th className="px-6 py-3">البيان</th>
                                <th className="px-6 py-3">الشريك</th>
                                <th className="px-6 py-3">مدين</th>
                                <th className="px-6 py-3">دائن</th>
                                <th className="px-6 py-3">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr className="bg-yellow-50 font-bold">
                                <td colSpan={6} className="px-6 py-3 text-left">الرصيد الافتتاحي</td>
                                <td className="px-6 py-3 dir-ltr">{Number(data.opening_balance).toLocaleString()}</td>
                            </tr>
                            {data.moves.map((m: GLMove, i: number) => (
                                <tr key={i}>
                                    <td className="px-6 py-3 whitespace-nowrap">{new Date(m.date).toLocaleDateString('en-CA')}</td>
                                    <td className="px-6 py-3 font-mono text-gray-500">{m.ref}</td>
                                    <td className="px-6 py-3 max-w-xs truncate">{m.line_name || m.move_narration}</td>
                                    <td className="px-6 py-3">{m.partner_name || "-"}</td>
                                    <td className="px-6 py-3 text-gray-600">{Number(m.debit) > 0 ? Number(m.debit).toLocaleString() : "-"}</td>
                                    <td className="px-6 py-3 text-gray-600">{Number(m.credit) > 0 ? Number(m.credit).toLocaleString() : "-"}</td>
                                    <td className="px-6 py-3 font-bold dir-ltr">{Number(m.running_balance).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
