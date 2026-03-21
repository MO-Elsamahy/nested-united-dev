import Link from "next/link";
import { ScrollText, BookOpen, FileBarChart } from "lucide-react";

export default function AccountingDashboard() {
    // Static stats for now - to be connected to real data later
    const stats = [
        { label: "النقدية", value: "0.00 SAR", color: "blue" },
        { label: "البنك", value: "0.00 SAR", color: "green" },
        { label: "مستحقات عملاء", value: "0.00 SAR", color: "purple" },
        { label: "مستحقات موردين", value: "0.00 SAR", color: "red" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">لوحة المؤشرات المالية</h1>
                <p className="text-gray-600 mt-2">نظرة عامة على الأداء المالي للمؤسسة</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className={`bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition border-t-4 border-${stat.color}-500`}>
                        <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold mt-2 text-gray-900 tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions Grid */}
            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">الوصول السريع</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link href="/accounting/journals" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:scale-110 transition-all duration-300">
                                <ScrollText className="w-8 h-8 text-blue-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">قيود اليومية</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">إدارة وتسجيل الحركات المالية اليومية، فواتير، وسندات صرف وقبض.</p>
                        </div>
                    </Link>

                    <Link href="/accounting/accounts" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:scale-110 transition-all duration-300">
                                <BookOpen className="w-8 h-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">دليل الحسابات</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">الهيكل التنظيمي للحسابات، الأصول، الخصوم، وتصنيف المصروفات.</p>
                        </div>
                    </Link>

                    <Link href="/accounting/reports" className="group block">
                        <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-lg transition border border-gray-100 h-full flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:scale-110 transition-all duration-300">
                                <FileBarChart className="w-8 h-8 text-purple-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">التقارير المتخصصة</h3>
                            <p className="text-gray-500 text-sm leading-relaxed">تحليل البيانات المالية، ميزان المراجعة، وقوائم الدخل والميزانية.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
