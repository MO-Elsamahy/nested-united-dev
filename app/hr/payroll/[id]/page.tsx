
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle, Trash2, Printer, Loader2, AlertTriangle, Download, Edit2, Save, X, PlusCircle, MinusCircle, Undo2, ScrollText } from "lucide-react";

export default function PayrollDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        basic_salary: 0,
        housing_allowance: 0,
        transport_allowance: 0,
        other_allowances: 0,
        overtime_amount: 0,
        absence_deduction: 0,
        late_deduction: 0,
        gosi_deduction: 0,
        custom_deduction: 0,
        custom_deduction_note: "",
        custom_addition: 0,
        custom_addition_note: ""
    });

    useEffect(() => {
        fetch(`/api/hr/payroll/${id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) setData(data);
                setLoading(false);
            });
    }, [id]);

    const handleUpdateLine = async (detailId: string) => {
        setProcessing(true);
        try {
            const res = await fetch(`/api/hr/payroll/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "update_line",
                    detail_id: detailId,
                    ...editForm
                }),
            });

            if (res.ok) {
                const updatedData = await res.json();
                // Update local state
                setData((prev: any) => ({
                    ...prev,
                    run: { ...prev.run, total_amount: updatedData.total_amount },
                    details: prev.details.map((d: any) => 
                        d.id === detailId 
                        ? { ...d, ...editForm, net_salary: updatedData.net_salary, total_deductions: updatedData.total_deductions } 
                        : d
                    )
                }));
                setEditingId(null);
                setSuccessMsg("تم تحديث سطر الراتب بنجاح");
                setTimeout(() => setSuccessMsg(null), 3000);
            } else {
                const err = await res.json();
                alert(err.error || "حدث خطأ");
            }
        } catch (error) {
            alert("فشل الاتصال");
        } finally {
            setProcessing(false);
        }
    };

    const startEditing = (row: any) => {
        setEditingId(row.id);
        setEditForm({
            basic_salary: Number(row.basic_salary || 0),
            housing_allowance: Number(row.housing_allowance || 0),
            transport_allowance: Number(row.transport_allowance || 0),
            other_allowances: Number(row.other_allowances || 0),
            overtime_amount: Number(row.overtime_amount || 0),
            absence_deduction: Number(row.absence_deduction || 0),
            late_deduction: Number(row.late_deduction || 0),
            gosi_deduction: 0,
            custom_deduction: Number(row.custom_deduction || 0),
            custom_deduction_note: row.custom_deduction_note || "",
            custom_addition: Number(row.custom_addition || 0),
            custom_addition_note: row.custom_addition_note || ""
        });
    };

    const handleAction = async (action: "approve" | "delete") => {
        if (!confirm(action === "approve"
            ? "هل أنت متأكد من اعتماد هذا المسير؟ سيتم إنشاء قيد محاسبي. يمكن لاحقاً إلغاء الاعتماد من صفحة المسير إن لزم."
            : "هل أنت متأكد من حذف هذه المسودة؟")) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/hr/payroll/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                if (action === "delete") {
                    router.push("/hr/payroll");
                } else {
                    setSuccessMsg("✅ تم اعتماد المسير وإنشاء القيد المحاسبي بنجاح! جاري التحديث...");
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                const err = await res.json();
                alert(err.error || "حدث خطأ");
            }
        } catch (error) {
            alert("فشل الاتصال");
        } finally {
            setProcessing(false);
        }
    };

    const handleRevertApproval = async () => {
        if (
            !confirm(
                "إلغاء اعتماد المسير؟ سيعود للمسودة، يُلغى تأكيد استلام الرواتب للموظفين، ويُخفى القيد المحاسبي من التقارير (دون حذفه من الأرشيف الداخلي). يمكنك التعديل ثم إعادة الاعتماد."
            )
        )
            return;
        const note = window.prompt("ملاحظة تُسجّل في سجل المسير (اختياري):", "");
        if (note === null) return;

        setProcessing(true);
        try {
            const res = await fetch(`/api/hr/payroll/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "revert_approval",
                    note: note.trim() || undefined,
                }),
            });
            const json = await res.json().catch(() => ({}));
            if (res.ok) {
                setSuccessMsg("تم إلغاء الاعتماد وتسجيل الإجراء في سجل المسير.");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                alert(json.error || "تعذر إلغاء الاعتماد");
            }
        } catch {
            alert("فشل الاتصال");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="text-center py-12">جاري التحميل...</div>;
    if (!data) return <div className="text-center py-12">غير موجود</div>;

    const { run, details } = data;
    const logs = Array.isArray(data.logs) ? data.logs : [];
    const isDraft = run.status === "draft";
    const isApproved = run.status === "approved";
    const isPaid = run.status === "paid";

    return (
        <div className="space-y-6">
            {/* Success Banner */}
            {successMsg && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
                    <span className="font-medium">{successMsg}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/hr/payroll" className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">مسير رواتب </h1>
                            <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    isDraft
                                        ? "bg-yellow-100 text-yellow-700"
                                        : isPaid
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-green-100 text-green-700"
                                }`}
                            >
                                {isDraft ? "مسودة" : isPaid ? "مدفوع" : "معتمد"}
                            </span>
                        </div>
                        <p className="text-gray-500">
                            {new Date(run.period_year, run.period_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isDraft ? (
                        <>
                            <button
                                onClick={() => handleAction("delete")}
                                disabled={processing}
                                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>حذف المسودة</span>
                            </button>
                            <button
                                onClick={() => handleAction("approve")}
                                disabled={processing}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition shadow-sm disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                <span>اعتماد المسير</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {isApproved && (
                                <button
                                    type="button"
                                    onClick={() => handleRevertApproval()}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-4 py-2 border border-amber-200 text-amber-800 hover:bg-amber-50 rounded-xl transition disabled:opacity-50"
                                >
                                    {processing ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Undo2 className="w-4 h-4" />
                                    )}
                                    <span>إلغاء الاعتماد</span>
                                </button>
                            )}
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 border text-gray-600 hover:bg-gray-50 rounded-xl transition"
                            >
                                <Printer className="w-4 h-4" />
                                <span>طباعة</span>
                            </button>
                            <button
                                onClick={() => window.open(`/api/hr/payroll/${id}/export?format=csv`, "_blank")}
                                className="flex items-center gap-2 px-4 py-2 border border-green-200 text-green-700 hover:bg-green-50 rounded-xl transition"
                                title="تصدير بصيغة CSV (يفتح في Excel)"
                            >
                                <Download className="w-4 h-4" />
                                <span>CSV</span>
                            </button>
                            <button
                                onClick={() => window.open(`/api/hr/payroll/${id}/export?format=xlsx`, "_blank")}
                                className="flex items-center gap-2 px-4 py-2 border border-violet-200 text-violet-700 hover:bg-violet-50 rounded-xl transition"
                                title="تصدير بصيغة Excel الأصلية (دعم كامل للعربية وRTL)"
                            >
                                <Download className="w-4 h-4" />
                                <span>Excel (XLSX)</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {!isDraft && (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
                        <ScrollText className="w-4 h-4 text-gray-500" />
                        <h2 className="text-sm font-semibold text-gray-800">سجل المسير</h2>
                    </div>
                    {logs.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-gray-500 text-center">
                            لا توجد أحداث مسجّلة بعد. بعد اعتماد المسير أو إلغاء الاعتماد يظهر السجل هنا.
                        </p>
                    ) : (
                        <ul className="divide-y max-h-56 overflow-y-auto text-sm">
                            {logs.map((entry: any) => (
                                <li key={entry.id} className="px-4 py-3 flex flex-col gap-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900">
                                            {entry.action === "approved"
                                                ? "اعتماد المسير"
                                                : entry.action === "reverted_approval"
                                                  ? "إلغاء الاعتماد"
                                                  : entry.action}
                                        </span>
                                        <span className="text-xs text-gray-500 tabular-nums">
                                            {entry.created_at
                                                ? new Date(entry.created_at).toLocaleString("ar-SA", {
                                                      dateStyle: "short",
                                                      timeStyle: "short",
                                                  })
                                                : ""}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {entry.user_name ? <>بواسطة {entry.user_name}</> : <>بواسطة مستخدم النظام</>}
                                    </div>
                                    {entry.note ? (
                                        <p className="text-xs text-amber-900 bg-amber-50 rounded-lg px-2 py-1.5 border border-amber-100">
                                            {entry.note}
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-gray-500 text-xs">إجمالي الرواتب والبدلات</p>
                    <p className="text-xl font-bold text-gray-900">
                        {details.reduce((acc: number, d: any) => acc + Number(d.gross_salary), 0).toLocaleString()} <span className="text-xs">SAR</span>
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-gray-500 text-xs">إجمالي الإضافي</p>
                    <p className="text-xl font-bold text-blue-600">
                        +{details.reduce((acc: number, d: any) => acc + Number(d.overtime_amount), 0).toLocaleString()} <span className="text-xs">SAR</span>
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-gray-500 text-xs">إجمالي الخصومات</p>
                    <p className="text-xl font-bold text-red-600">
                        -{details.reduce((acc: number, d: any) => acc + Number(d.total_deductions), 0).toLocaleString()} <span className="text-xs">SAR</span>
                    </p>
                </div>
                <div className="bg-violet-50 p-4 rounded-xl border border-violet-100 shadow-sm">
                    <p className="text-violet-700 text-xs">صافي الرواتب المستحقة</p>
                    <p className="text-2xl font-bold text-violet-900">
                        {Number(run.total_amount).toLocaleString()} <span className="text-sm">SAR</span>
                    </p>
                </div>
            </div>

            {/* Details Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden text-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-4 py-3 font-medium text-gray-500">الموظف</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">الأساسي</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">البدلات</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">إضافي</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">إضافات أخرى</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">خصم غياب</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">خصم تأخير</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">تأمينات</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">خصومات أخرى</th>
                                <th className="text-center px-4 py-3 font-bold text-gray-900 text-base">الصافي</th>
                                {!isDraft && <th className="text-center px-4 py-3 font-medium text-gray-500">تأكيد الاستلام</th>}
                                {isDraft && <th className="text-center px-4 py-3 font-medium text-gray-500">تعديل</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {details.map((row: any) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900">{row.full_name}</p>
                                        <p className="text-xs text-gray-500">{row.job_title}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.basic_salary}
                                                onChange={(e) => setEditForm({...editForm, basic_salary: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center font-medium"
                                            />
                                        ) : Number(row.basic_salary).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {editingId === row.id ? (
                                            <div className="flex flex-col gap-1">
                                                <input 
                                                    type="number" 
                                                    value={editForm.housing_allowance}
                                                    onChange={(e) => setEditForm({...editForm, housing_allowance: Number(e.target.value)})}
                                                    className="w-16 px-1 py-1 border rounded text-center text-xs"
                                                    placeholder="سكن"
                                                />
                                                <input 
                                                    type="number" 
                                                    value={editForm.transport_allowance}
                                                    onChange={(e) => setEditForm({...editForm, transport_allowance: Number(e.target.value)})}
                                                    className="w-16 px-1 py-1 border rounded text-center text-xs"
                                                    placeholder="مواصلات"
                                                />
                                            </div>
                                        ) : (Number(row.housing_allowance) + Number(row.transport_allowance) + Number(row.other_allowances)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-600 font-medium">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.overtime_amount}
                                                onChange={(e) => setEditForm({...editForm, overtime_amount: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center"
                                            />
                                        ) : (Number(row.overtime_amount) > 0 ? `+${Number(row.overtime_amount).toLocaleString()}` : '-')}
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-500">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.custom_addition}
                                                onChange={(e) => setEditForm({...editForm, custom_addition: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center"
                                                placeholder="مبلغ"
                                            />
                                        ) : (
                                            Number(row.custom_addition) > 0 ? (
                                                <div title={row.custom_addition_note}>
                                                    +{Number(row.custom_addition).toLocaleString()}
                                                    {row.custom_addition_note && <span className="block text-[10px] opacity-70">{row.custom_addition_note}</span>}
                                                </div>
                                            ) : '-'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.absence_deduction}
                                                onChange={(e) => setEditForm({...editForm, absence_deduction: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center"
                                            />
                                        ) : (Number(row.absence_deduction) > 0 ? `-${Number(row.absence_deduction).toFixed(2)}` : '-')}
                                        {row.absent_days > 0 && !editingId && <span className="block text-xs text-red-400">({row.absent_days} يوم)</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.late_deduction}
                                                onChange={(e) => setEditForm({...editForm, late_deduction: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center"
                                            />
                                        ) : (Number(row.late_deduction) > 0 ? `-${Number(row.late_deduction).toFixed(2)}` : '-')}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">
                                        {Number(row.gosi_deduction).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-500">
                                        {editingId === row.id ? (
                                            <input 
                                                type="number" 
                                                value={editForm.custom_deduction}
                                                onChange={(e) => setEditForm({...editForm, custom_deduction: Number(e.target.value)})}
                                                className="w-20 px-1 py-1 border rounded text-center"
                                                placeholder="مبلغ"
                                            />
                                        ) : (
                                            Number(row.custom_deduction) > 0 ? (
                                                <div title={row.custom_deduction_note}>
                                                    -{Number(row.custom_deduction).toLocaleString()}
                                                    {row.custom_deduction_note && <span className="block text-[10px] opacity-70">{row.custom_deduction_note}</span>}
                                                </div>
                                            ) : '-'
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-gray-900 text-lg bg-gray-50/50">
                                        {Number(row.net_salary).toLocaleString()}
                                    </td>
                                    {!isDraft && (
                                        <td className="px-4 py-3 text-center">
                                            {row.salary_confirmed_at ? (
                                                <span className="flex flex-col items-center text-green-600">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="text-[10px]">{new Date(row.salary_confirmed_at).toLocaleDateString("ar-SA")}</span>
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">في انتظار التأكيد</span>
                                            )}
                                        </td>
                                    )}
                                    {isDraft && (
                                        <td className="px-4 py-3 text-center">
                                            {editingId === row.id ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <button 
                                                        onClick={() => handleUpdateLine(row.id)}
                                                        disabled={processing}
                                                        className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                                                        title="حفظ"
                                                    >
                                                        {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                    </button>
                                                    <button 
                                                        onClick={() => setEditingId(null)}
                                                        className="p-1.5 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                                        title="إلغاء"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => startEditing(row)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition"
                                                    title="تعديل الخصومات والإضافات"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
