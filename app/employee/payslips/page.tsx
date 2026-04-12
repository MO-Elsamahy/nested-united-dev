"use client";

import { useState, useEffect } from "react";
import { Receipt, Download, Loader2, CheckCircle, Handshake } from "lucide-react";

export default function EmployeePayslipsPage() {
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState<string | null>(null);

    useEffect(() => {
        fetchPayslips();
    }, []);

    const fetchPayslips = async () => {
        try {
            const res = await fetch("/api/hr/payroll/me");
            const data = await res.json();
            if (Array.isArray(data)) {
                setPayslips(data);
            }
        } catch (error) {
            console.error("Failed to fetch payslips");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (payrollRunId: string) => {
        if (!confirm("هل تؤكد استلامك لراتب هذا الشهر؟")) return;

        setConfirmingId(payrollRunId);
        try {
            const res = await fetch(`/api/hr/payroll/${payrollRunId}/confirm-salary`, {
                method: "POST"
            });
            if (res.ok) {
                alert("تم تأكيد الاستلام بنجاح");
                fetchPayslips();
            } else {
                const err = await res.json();
                alert(err.error || "حدث خطأ أثناء التأكيد");
            }
        } catch (error) {
            alert("فشل الاتصال بالخادم");
        } finally {
            setConfirmingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600 mb-4" />
                <p className="text-gray-500">جاري تحميل كشوف الراتب...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">كشوف الراتب</h1>
            </div>

            {payslips.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد كشوف راتب</h3>
                    <p>ستظهر كشوف الراتب هنا بعد اعتمادها من الموارد البشرية</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {payslips.map((ps) => (
                        <div key={ps.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        راتب شهر {new Date(ps.period_year, ps.period_month - 1).toLocaleString('ar-SA', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                        <span className="font-mono font-bold text-violet-700">{Number(ps.net_salary).toLocaleString()} SAR</span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                        <span>تاريخ الاعتماد: {new Date(ps.approved_at).toLocaleDateString("ar-SA")}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {ps.salary_confirmed_at ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-medium border border-green-100">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>تم التأكيد في {new Date(ps.salary_confirmed_at).toLocaleDateString("ar-SA")}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleConfirm(ps.payroll_run_id)}
                                        disabled={confirmingId === ps.payroll_run_id}
                                        className="flex items-center gap-2 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg shadow-violet-200 transition disabled:opacity-50"
                                    >
                                        {confirmingId === ps.payroll_run_id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Handshake className="w-4 h-4" />
                                        )}
                                        <span>تأكيد الاستلام</span>
                                    </button>
                                )}
                                
                                <button
                                    onClick={() => alert("سيتم تفعيل طباعة كشف الراتب الفردي قريباً")}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition"
                                    title="تحميل كشف الراتب"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
