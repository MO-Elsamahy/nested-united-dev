"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, ArrowRight, AlertCircle, Paperclip, UploadCloud, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

interface JournalLine {
    id: string;
    account_id: string;
    partner_id: string;
    cost_center_id?: string;
    name: string;
    debit: number;
    credit: number;
}

export default function EditEntry() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [date, setDate] = useState("");
    const [ref, setRef] = useState("");
    const [narration, setNarration] = useState("");
    const [journalId, setJournalId] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachment, setAttachment] = useState<File | null>(null);

    const [lines, setLines] = useState<JournalLine[]>([]);

    const [accounts, setAccounts] = useState<Array<{ id: string; name: string; code: string }>>([]);
    const [journals, setJournals] = useState<Array<{ id: string; name: string }>>([]);
    const [costCenters, setCostCenters] = useState<Array<{ id: string; name: string }>>([]);
    const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Totals
    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    useEffect(() => {
        if (!id) return;

        // Fetch lookups and current move data
        Promise.all([
            fetch("/api/accounting/accounts").then(r => r.json()),
            fetch("/api/accounting/journals").then(r => r.json()),
            fetch("/api/accounting/cost-centers").then(r => r.ok ? r.json() : []).catch(() => []),
            fetch("/api/accounting/partners").then(r => r.ok ? r.json() : []).catch(() => []),
            fetch(`/api/accounting/moves/${id}`).then(async r => {
                if (!r.ok) {
                    const err = await r.json();
                    throw new Error(err.error || "تعذر تحميل بيانات القيد");
                }
                return r.json();
            })
        ]).then(([acc, jrn, cc, prt, moveData]) => {
            setAccounts(acc);
            setJournals(jrn);
            setCostCenters(cc);
            setPartners(prt);

            const m = moveData.move;
            setDate(m.date ? new Date(m.date).toISOString().split("T")[0] : "");
            setRef(m.ref || "");
            setNarration(m.narration || "");
            setJournalId(m.journal_id || "");
            setAttachmentUrl(m.attachment_url || "");

            // Map existing lines
            const mappedLines = (moveData.lines || []).map((l: any) => ({
                id: l.id || Math.random().toString(),
                account_id: l.account_id || "",
                partner_id: l.partner_id || "",
                cost_center_id: l.cost_center_id || "",
                name: l.name || "",
                debit: Number(l.debit) || 0,
                credit: Number(l.credit) || 0
            }));
            setLines(mappedLines);
            setLoading(false);
        }).catch(err => {
            setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع");
            setLoading(false);
        });
    }, [id]);

    const addLine = () => setLines([...lines, { id: Date.now().toString(), account_id: "", partner_id: "", cost_center_id: "", name: narration, debit: 0, credit: 0 }]);
    const removeLine = (id: string) => lines.length > 2 && setLines(lines.filter(l => l.id !== id));

    const updateLine = (id: string, field: keyof JournalLine, val: string | number) => {
        setLines(lines.map(l => {
            if (l.id !== id) return l;
            if (field === "debit" && Number(val) > 0) return { ...l, [field]: Number(val), credit: 0 };
            if (field === "credit" && Number(val) > 0) return { ...l, [field]: Number(val), debit: 0 };
            return { ...l, [field]: val } as JournalLine;
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced || !journalId || saving) return;
        setSaving(true);
        setError("");

        try {
            // Upload attachment if any
            let finalAttachmentUrl = attachmentUrl;
            if (attachment) {
                const formData = new FormData();
                formData.append("file", attachment);

                try {
                    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
                    if (uploadRes.ok) {
                        const data = await uploadRes.json();
                        finalAttachmentUrl = data.url;
                    }
                } catch (err: unknown) {
                    console.error("Upload Error", err);
                }
            }

            // Update Move
            const res = await fetch(`/api/accounting/moves/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    journal_id: journalId,
                    date,
                    ref,
                    narration,
                    attachment_url: finalAttachmentUrl || null,
                    lines: lines.map(({ id: _id, ...rest }) => rest)
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "فشل الحفظ. تأكد من البيانات.");
            }
            router.push(`/accounting/journals/${journalId}`);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "حدث خطأ غير متوقع";
            setError(msg);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري تحميل بيانات القيد...
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg">
                    <ArrowRight className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">تعديل قيد يومية</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Form */}
                <div className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">الدفتر *</label>
                        <select value={journalId} onChange={e => setJournalId(e.target.value)} className="w-full border rounded-lg p-2" required>
                            <option value="">اختر...</option>
                            {journals.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">التاريخ *</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border rounded-lg p-2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المرجع (Ref)</label>
                        <input type="text" value={ref} onChange={e => setRef(e.target.value)} className="w-full border rounded-lg p-2" placeholder="رقم الفاتورة..." />
                    </div>
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium mb-1">البيان (شرح القيد)</label>
                        <input type="text" value={narration} onChange={e => setNarration(e.target.value)} className="w-full border rounded-lg p-2" placeholder="شرح مختصر..." />
                    </div>

                    <div className="md:col-span-4 mt-2">
                        <label className="block text-sm font-medium mb-2 text-gray-700">المرفقات</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition cursor-pointer relative bg-slate-50">
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*,application/pdf"
                                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                            />
                            {attachment ? (
                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                    <Paperclip className="w-5 h-5" />
                                    <span>{attachment.name}</span>
                                    <span className="text-gray-400 text-sm">({(attachment.size / 1024).toFixed(0)} KB)</span>
                                </div>
                            ) : attachmentUrl ? (
                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                    <Paperclip className="w-5 h-5" />
                                    <span>الملف الحالي</span>
                                    <a href={attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline text-sm">عرض المرفق</a>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-500">
                                    <UploadCloud className="w-5 h-5" />
                                    <span className="text-sm">اضغط لرفع ملف (PDF/Image) أو استبدال المرفق الحالي</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lines Table */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <table className="w-full text-right divide-y">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-2 w-[25%]">الحساب</th>
                                <th className="px-3 py-2 w-[15%]">مركز التكلفة</th>
                                <th className="px-3 py-2 w-[15%]">الشريك (اختياري)</th>
                                <th className="px-3 py-2 w-[25%]">البيان</th>
                                <th className="px-3 py-2 w-[10%]">مدين</th>
                                <th className="px-3 py-2 w-[10%]">دائن</th>
                                <th className="px-3 py-2 w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {lines.map(l => (
                                <tr key={l.id} className="hover:bg-slate-50">
                                    <td className="p-2 align-top">
                                        <select value={l.account_id} onChange={e => updateLine(l.id, "account_id", e.target.value)} className="w-full border rounded p-1.5 text-sm" required>
                                            <option value="">اختر الحساب...</option>
                                            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 align-top">
                                        <select value={l.cost_center_id} onChange={e => updateLine(l.id, "cost_center_id", e.target.value)} className="w-full border rounded p-1.5 text-sm">
                                            <option value="">-</option>
                                            {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 align-top">
                                        <select value={l.partner_id} onChange={e => updateLine(l.id, "partner_id", e.target.value)} className="w-full border rounded p-1.5 text-sm">
                                            <option value="">-</option>
                                            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2 align-top">
                                        <input value={l.name} onChange={e => updateLine(l.id, "name", e.target.value)} className="w-full border rounded p-1.5 text-sm" placeholder={narration || "بيان"} />
                                    </td>
                                    <td className="p-2 align-top">
                                        <input type="number" min="0" step="0.01" value={l.debit} onChange={e => updateLine(l.id, "debit", e.target.value)} className="w-full border rounded p-1.5 text-sm font-medium" />
                                    </td>
                                    <td className="p-2 align-top">
                                        <input type="number" min="0" step="0.01" value={l.credit} onChange={e => updateLine(l.id, "credit", e.target.value)} className="w-full border rounded p-1.5 text-sm font-medium" />
                                    </td>
                                    <td className="p-2 align-top text-center">
                                        <button type="button" onClick={() => removeLine(l.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t">
                            <tr>
                                <td colSpan={4} className="p-2">
                                    <button type="button" onClick={addLine} className="flex items-center gap-1 text-blue-600 text-sm hover:underline">
                                        <Plus className="w-4 h-4" /> إضافة بند جديد
                                    </button>
                                </td>
                                <td className="p-2 text-green-700">{totalDebit.toFixed(2)}</td>
                                <td className="p-2 text-green-700">{totalCredit.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center sticky bottom-0 bg-white p-4 border-t shadow-lg z-10 md:relative md:shadow-none md:border-none md:p-0">
                    {error ? (
                        <span className="text-red-600 font-medium flex items-center gap-2 bg-red-50 px-3 py-1 rounded">
                            <AlertCircle className="w-5 h-5" /> {error}
                        </span>
                    ) : (
                        !isBalanced ? (
                            <span className="text-red-500 font-medium flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" /> القيد غير متزن (الفرق: {Math.abs(totalDebit - totalCredit).toFixed(2)})
                            </span>
                        ) : <span></span>
                    )}

                    <div className="flex gap-2">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">إلغاء</button>
                        <button disabled={!isBalanced || saving} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow transition">
                            {saving ? "جاري الحفظ..." : "حفظ وترحيل (Post)"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
