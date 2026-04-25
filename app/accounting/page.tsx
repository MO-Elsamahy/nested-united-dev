import Link from "next/link";
import { ScrollText, BookOpen, FileBarChart } from "lucide-react";
import { getAccountingDashboardStats } from "@/lib/accounting-dashboard-stats";

function formatSar(n: number): string {
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n < 0) return `− ${formatted} ر.س`;
    return `${formatted} ر.س`;
}

export default async function AccountingDashboard() {
    const stats = await getAccountingDashboardStats();

    const cards = [
        { label: "النقدية", value: stats.cash, borderClass: "border-t-blue-500", colorLabel: "text-gray-500" },
        { label: "البنك", value: stats.bank, borderClass: "border-t-emerald-500", colorLabel: "text-gray-500" },
        { label: "مستحقات عملاء", value: stats.receivables, borderClass: "border-t-violet-500", colorLabel: "text-gray-500" },
        { label: "مستحقات موردين", value: stats.payables, borderClass: "border-t-rose-500", colorLabel: "text-gray-500" },
    ] as const;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">لوحة المؤشرات المالية</h1>
                <p className="text-gray-600 mt-2">نظرة عامة على الأداء المالي للمؤسسة</p>
                <p className="text-xs text-gray-400 mt-1">
                    الأرصدة محسوبة من القيود المرحّلة حتى{" "}
                    <span className="font-mono tabular-nums">{stats.as_of_date}</span> (أرصدة الحسابات حسب نوعها).
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((stat) => (
                    <div
                        key={stat.label}
                        className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition border-t-4 ${stat.borderClass}`}
                    >
                        <p className={`text-sm font-medium ${stat.colorLabel}`}>{stat.label}</p>
                        <p className="text-3xl font-bold mt-2 text-gray-900 tracking-tight tabular-nums">
                            {formatSar(stat.value)}
                        </p>
                    </div>
                ))}
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">الوصول السريع</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/accounting/journals" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300">
                                <ScrollText className="w-8 h-8 text-blue-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">قيود اليومية</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                إدارة وتسجيل الحركات المالية اليومية، فواتير، وسندات صرف وقبض.
                            </p>
                        </div>
                    </Link>

                    <Link href="/accounting/accounts" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:scale-110 transition-all duration-300">
                                <BookOpen className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">دليل الحسابات</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                الهيكل التنظيمي للحسابات، الأصول، الخصوم، وتصنيف المصروفات.
                            </p>
                        </div>
                    </Link>

                    <Link href="/accounting/reports" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:scale-110 transition-all duration-300">
                                <FileBarChart className="w-8 h-8 text-purple-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">التقارير المتخصصة</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                تحليل البيانات المالية، ميزان المراجعة، وقوائم الدخل والميزانية.
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
