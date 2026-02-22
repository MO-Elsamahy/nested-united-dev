"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Printer, Search } from "lucide-react";
import Link from "next/link";

export default function PartnerLedgerPage() {
    const [partners, setPartners] = useState<any[]>([]); // Need an API for this
    const [selectedPartner, setSelectedPartner] = useState("");
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    // Temp mock for partners until creation UI exists
    useEffect(() => {
        // TODO: Fetch from /api/accounting/partners
        // setPartners([{id: 'uuid', name: 'عميل افتراضي'}]);
    }, []);

    async function fetchReport() {
        if (!selectedPartner) return;
        setLoading(true);
        try {
            const p = new URLSearchParams();
            p.set("partner_id", selectedPartner);
            if (from) p.set("from", from);
            if (to) p.set("to", to);
            const res = await fetch(`/api/accounting/reports/partner-ledger?${p}`);
            if (res.ok) setData(await res.json());
        } finally { setLoading(false); }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 rounded-full"><ArrowRight className="w-5 h-5" /></Link>
                    <h1 className="text-2xl font-bold">كشف حساب (Partner Ledger)</h1>
                </div>
                <button onClick={() => window.print()} className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">
                    <Printer className="w-4 h-4" />
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-sm print:hidden space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">العميل / المورد</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="أدخل معرف الشريك مؤقتاً (Partner ID)"
                            value={selectedPartner}
                            onChange={e => setSelectedPartner(e.target.value)}
                            className="flex-1 border rounded-lg p-2"
                        />
                        <button onClick={fetchReport} className="bg-blue-600 text-white px-6 rounded-lg">عرض</button>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">سيتم استبدال هذا بحقل بحث ذكي في التحديث القادم.</p>
                </div>
            </div>

            {data && (
                <div className="bg-white border rounded-xl overflow-hidden print:border-none">
                    <div className="p-8 pb-4 text-center hidden print:block">
                        <h2 className="text-xl font-bold">كشف حساب</h2>
                        <p>العميل: {selectedPartner}</p>
                    </div>
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 border-b font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-3">التاريخ</th>
                                <th className="px-6 py-3">المرجع</th>
                                <th className="px-6 py-3">البيان</th>
                                <th className="px-6 py-3">مدين</th>
                                <th className="px-6 py-3">دائن</th>
                                <th className="px-6 py-3">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            <tr className="bg-yellow-50 font-bold">
                                <td colSpan={5} className="px-6 py-3 text-left">الرصيد الافتتاحي</td>
                                <td className="px-6 py-3 dir-ltr">{Number(data.opening_balance).toLocaleString()}</td>
                            </tr>
                            {data.moves.map((m: any, i: number) => (
                                <tr key={i}>
                                    <td className="px-6 py-3 whitespace-nowrap">{new Date(m.date).toLocaleDateString('en-CA')}</td>
                                    <td className="px-6 py-3">{m.ref}</td>
                                    <td className="px-6 py-3 max-w-xs truncate">{m.line_name || m.move_narration}</td>
                                    <td className="px-6 py-3">{Number(m.debit) > 0 ? Number(m.debit).toLocaleString() : "-"}</td>
                                    <td className="px-6 py-3">{Number(m.credit) > 0 ? Number(m.credit).toLocaleString() : "-"}</td>
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
