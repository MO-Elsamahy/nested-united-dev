
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, DollarSign, Calendar, CheckCircle, Clock } from "lucide-react";

export default function PayrollListPage() {
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/hr/payroll")
            .then((res) => res.json())
            .then((data) => {
                setRuns(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    const getStatusBadge = (status: string) => {
        if (status === "approved" || status === "paid") {
            return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs"><CheckCircle className="w-3 h-3" /> معتمد</span>;
        }
        return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs"><Clock className="w-3 h-3" /> مسودة</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">مسيرات الرواتب</h1>
                    <p className="text-gray-500">إدارة الرواتب الشهرية</p>
                </div>
                <Link
                    href="/hr/payroll/new"
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>إنشاء مسير جديد</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">الفترة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">عدد الموظفين</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إجمالي المبلغ</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحالة</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">تم الإنشاء بواسطة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8">جاري التحميل...</td></tr>
                            ) : runs.length > 0 ? (
                                runs.map((run: any) => (
                                    <tr key={run.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 font-bold text-gray-900">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span>{new Date(run.period_year, run.period_month - 1).toLocaleString('ar-EG', { month: 'long', year: 'numeric' })}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">{run.total_employees}</td>
                                        <td className="px-6 py-4 text-center font-mono font-bold text-green-700">
                                            {Number(run.total_amount).toLocaleString('en-US')} SAR
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(run.status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {run.created_by_name}
                                            <div className="text-xs text-gray-400">{new Date(run.created_at).toLocaleDateString("ar-EG")}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                href={`/hr/payroll/${run.id}`}
                                                className="text-violet-600 hover:text-violet-800 text-sm font-medium"
                                            >
                                                عرض التفاصيل
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        لا توجد مسيرات رواتب سابقة
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
