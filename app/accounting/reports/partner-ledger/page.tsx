"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, Printer, Search, ChevronDown, X } from "lucide-react";
import Link from "next/link";

interface Partner {
    id: string;
    name: string;
    type: string;
    phone?: string;
    email?: string;
}

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

export default function PartnerLedgerPage() {
    const [partnerQuery, setPartnerQuery] = useState("");
    const [allPartners, setAllPartners] = useState<Partner[]>([]);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [data, setData] = useState<GLData | null>(null);
    const [loading, setLoading] = useState(false);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // جلب الشركاء
    useEffect(() => {
        fetch("/api/accounting/partners")
            .then(r => r.ok ? r.json() : [])
            .then(setAllPartners)
            .catch(() => { });

        // إغلاق الـ dropdown عند الضغط خارجه
        const handler = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const suggestions = allPartners.filter(p => {
        if (!partnerQuery || (selectedPartner && partnerQuery === selectedPartner.name)) {
            return true;
        }
        return p.name.toLowerCase().includes(partnerQuery.toLowerCase()) ||
               (p.phone && p.phone.includes(partnerQuery));
    });

    const fetchReport = useCallback(async () => {
        if (!selectedPartner) return;
        setLoading(true);
        try {
            const p = new URLSearchParams();
            p.set("partner_id", selectedPartner.id);
            if (fromDate) p.set("from", fromDate);
            if (toDate) p.set("to", toDate);
            const res = await fetch(`/api/accounting/reports/partner-ledger?${p}`);
            if (res.ok) setData(await res.json() as GLData);
        } catch (e: unknown) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedPartner, fromDate, toDate]);

    const getTypeLabel = (type: string) => {
        if (type === "customer") return "عميل";
        if (type === "supplier" || type === "vendor") return "مورد";
        if (type === "employee") return "موظف";
        return type;
    };

    const getTypeColor = (type: string) => {
        if (type === "customer") return "bg-blue-100 text-blue-700";
        if (type === "supplier" || type === "vendor") return "bg-orange-100 text-orange-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/accounting/reports" className="p-2 hover:bg-slate-100 rounded-full">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">كشف الحساب</h1>
                        <p className="text-gray-500 text-sm">حركات العملاء والموردين</p>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-white border text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                </button>
            </div>

            {/* Filter Panel */}
            <div className="bg-white p-6 rounded-xl border shadow-sm print:hidden space-y-4">
                <h2 className="font-bold text-gray-700 mb-3">اختر الشريك والفترة</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Partner Autocomplete */}
                    <div ref={autocompleteRef} className="relative md:col-span-1">
                        <label className="block text-sm font-medium mb-1 text-gray-700">العميل / المورد</label>
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="text"
                                value={partnerQuery}
                                onChange={(e) => {
                                    setPartnerQuery(e.target.value);
                                    setSelectedPartner(null);
                                    setShowSuggestions(true);
                                    setData(null);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                                placeholder="ابحث باسم العميل أو المورد..."
                                className={`w-full pr-9 pl-16 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${selectedPartner ? "border-green-400 bg-green-50" : ""}`}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {partnerQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPartnerQuery("");
                                            setSelectedPartner(null);
                                            setData(null);
                                            setShowSuggestions(true);
                                        }}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 animate-in fade-in duration-200"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Suggestions dropdown */}
                        {showSuggestions && (
                            <div className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                                {suggestions.length > 0 ? (
                                    suggestions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedPartner(p);
                                                setPartnerQuery(p.name);
                                                setShowSuggestions(false);
                                            }}
                                            className="w-full text-right px-4 py-3 hover:bg-blue-50 border-b last:border-0 flex items-center justify-between gap-3"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">{p.name}</p>
                                                {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(p.type)}`}>
                                                {getTypeLabel(p.type)}
                                            </span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-3 text-gray-400 text-sm">لا توجد نتائج</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">من تاريخ</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700">إلى تاريخ</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <button
                    onClick={fetchReport}
                    disabled={!selectedPartner || loading}
                    className="mt-2 bg-blue-600 text-white px-8 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
                >
                    {loading ? "جاري التحميل..." : "عرض كشف الحساب"}
                </button>
            </div>

            {/* Report */}
            {data && selectedPartner && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    {/* Professional Print Header */}
                    <div className="print-only-header px-8 pt-8 pb-4">
                        <div className="report-title">
                            <h1>كشف حساب</h1>
                            <p>{selectedPartner.name} — {getTypeLabel(selectedPartner.type)}</p>
                            {(fromDate || toDate) && (
                                <p className="text-sm font-normal">من {fromDate || "بداية"} إلى {toDate || "نهاية"}</p>
                            )}
                        </div>
                        <div className="company-info flex items-center gap-4">
                            <div className="text-left">
                                <strong>NESTED UNITED</strong><br/>
                                <span className="text-gray-500">نظام الإدارة المالية</span>
                            </div>
                            <img src="/logo.png" alt="Company Logo" className="h-10 object-contain" />
                        </div>
                    </div>

                    {/* Print Header Default (Hidden with print-only-header added) */}
                    <div className="p-8 pb-4 text-center hidden print:hidden">
                        <h2 className="text-xl font-bold">كشف حساب</h2>
                        <p className="text-gray-600">
                            {selectedPartner.name} — {getTypeLabel(selectedPartner.type)}
                        </p>
                        {(fromDate || toDate) && (
                            <p className="text-sm text-gray-500">
                                {fromDate && `من ${fromDate}`} {toDate && `إلى ${toDate}`}
                            </p>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between print:hidden">
                        <div>
                            <span className="font-bold text-gray-800">{selectedPartner.name}</span>
                            <span className={`mr-2 text-xs px-2 py-0.5 rounded-full ${getTypeColor(selectedPartner.type)}`}>
                                {getTypeLabel(selectedPartner.type)}
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            {data.moves.length} حركة
                            {(fromDate || toDate) && ` | ${fromDate || "..."} → ${toDate || "..."}`}
                        </div>
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
                                <td colSpan={5} className="px-6 py-3 text-right">الرصيد الافتتاحي</td>
                                <td className="px-6 py-3 dir-ltr font-mono">
                                    {Number(data.opening_balance).toLocaleString("ar-SA")}
                                </td>
                            </tr>
                            {data.moves.map((m: GLMove, i: number) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 whitespace-nowrap text-gray-500">
                                        {(() => { const d = new Date(m.date); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}
                                    </td>
                                    <td className="px-6 py-3 font-mono text-xs">{m.ref || "—"}</td>
                                    <td className="px-6 py-3 max-w-xs truncate">{m.line_name || m.move_narration}</td>
                                    <td className="px-6 py-3 text-green-700 font-medium">
                                        {Number(m.debit) > 0 ? Number(m.debit).toLocaleString("ar-SA") : "—"}
                                    </td>
                                    <td className="px-6 py-3 text-red-600 font-medium">
                                        {Number(m.credit) > 0 ? Number(m.credit).toLocaleString("ar-SA") : "—"}
                                    </td>
                                    <td className={`px-6 py-3 font-bold dir-ltr font-mono ${Number(m.running_balance) >= 0 ? "text-green-700" : "text-red-600"}`}>
                                        {Number(m.running_balance).toLocaleString("ar-SA")}
                                    </td>
                                </tr>
                            ))}
                            {data.moves.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                                        لا توجد حركات في هذه الفترة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {data.moves.length > 0 && (
                            <tfoot className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-right">الرصيد الختامي</td>
                                    <td className="px-6 py-3 text-green-700">
                                        {data.moves.reduce((s, m) => s + Number(m.debit), 0).toLocaleString("ar-SA")}
                                    </td>
                                    <td className="px-6 py-3 text-red-600">
                                        {data.moves.reduce((s, m) => s + Number(m.credit), 0).toLocaleString("ar-SA")}
                                    </td>
                                    <td className={`px-6 py-3 font-mono dir-ltr ${(data.moves[data.moves.length - 1]?.running_balance ?? 0) >= 0 ? "text-green-700" : "text-red-600"}`}>
                                        {Number(data.moves[data.moves.length - 1]?.running_balance ?? 0).toLocaleString("ar-SA")}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    {/* Print Signatures Block */}
                    <div className="print-signatures hidden print:flex mt-12 mb-8">
                        <div className="print-signature-box">
                            <p className="font-bold">المحاسب</p>
                            <div className="print-signature-line">الاسم والتوقيع</div>
                        </div>
                        <div className="print-signature-box">
                            <p className="font-bold">المدير المالي</p>
                            <div className="print-signature-line">الاسم والتوقيع</div>
                        </div>
                        <div className="print-signature-box">
                            <p className="font-bold">المدير العام</p>
                            <div className="print-signature-line">الاسم والتوقيع</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
