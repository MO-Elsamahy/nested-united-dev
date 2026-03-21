
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle, Trash2, Printer, Loader2, AlertTriangle, Download } from "lucide-react";

export default function PayrollDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/hr/payroll/${id}`)
            .then((res) => res.json())
            .then((data) => {
                if (!data.error) setData(data);
                setLoading(false);
            });
    }, [id]);

    const handleAction = async (action: "approve" | "delete") => {
        if (!confirm(action === "approve"
            ? "هل أنت متأكد من اعتماد هذا المسير؟ لا يمكن التراجع عن هذا الإجراء وسيتم إنشاء قيد محاسبي."
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

    if (loading) return <div className="text-center py-12">جاري التحميل...</div>;
    if (!data) return <div className="text-center py-12">غير موجود</div>;

    const { run, details } = data;
    const isDraft = run.status === 'draft';

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
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isDraft ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                                }`}>
                                {isDraft ? "مسودة" : "معتمد"}
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
                                <th className="text-center px-4 py-3 font-medium text-gray-500">خصم غياب</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">خصم تأخير</th>
                                <th className="text-center px-4 py-3 font-medium text-gray-500">تأمينات</th>
                                <th className="text-center px-4 py-3 font-bold text-gray-900 text-base">الصافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {details.map((row: any) => (
                                <tr key={row.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-gray-900">{row.full_name}</p>
                                        <p className="text-xs text-gray-500">{row.job_title}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-600">{Number(row.basic_salary).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {(Number(row.housing_allowance) + Number(row.transport_allowance) + Number(row.other_allowances)).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-center text-blue-600 font-medium">
                                        {Number(row.overtime_amount) > 0 ? `+${Number(row.overtime_amount).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600">
                                        {Number(row.absence_deduction) > 0 ? `-${Number(row.absence_deduction).toFixed(2)}` : '-'}
                                        {row.absent_days > 0 && <span className="block text-xs text-red-400">({row.absent_days} يوم)</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-red-600">
                                        {Number(row.late_deduction) > 0 ? `-${Number(row.late_deduction).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-gray-500">
                                        {Number(row.gosi_deduction).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-gray-900 text-lg bg-gray-50/50">
                                        {Number(row.net_salary).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
