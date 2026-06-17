import Link from "next/link";
import { FileBarChart, Book, Users, TrendingDown, Building2, BarChart3, ArrowRight } from "lucide-react";

const reports = [
    {
        href: "/accounting/reports/trial-balance",
        icon: FileBarChart,
        iconBg: "bg-blue-100 group-hover:bg-blue-600",
        iconColor: "text-blue-600 group-hover:text-white",
        title: "ميزان المراجعة",
        description: "أرصدة جميع الحسابات ومطابقتها (Trial Balance).",
    },
    {
        href: "/accounting/reports/income-statement",
        icon: TrendingDown,
        iconBg: "bg-green-100 group-hover:bg-green-600",
        iconColor: "text-green-600 group-hover:text-white",
        title: "قائمة الدخل",
        description: "نتائج الأعمال من أرباح وخسائر خلال فترة محددة (Profit & Loss).",
    },
    {
        href: "/accounting/reports/balance-sheet",
        icon: Building2,
        iconBg: "bg-violet-100 group-hover:bg-violet-600",
        iconColor: "text-violet-600 group-hover:text-white",
        title: "قائمة المركز المالي",
        description: "الأصول والخصوم وحقوق الملكية في تاريخ معين (Balance Sheet).",
    },
    {
        href: "/accounting/reports/revenue-expenses",
        icon: BarChart3,
        iconBg: "bg-amber-100 group-hover:bg-amber-600",
        iconColor: "text-amber-600 group-hover:text-white",
        title: "تقرير الإيرادات والتكاليف",
        description: "تفاصيل الإيرادات والمصروفات شهرياً وحسب مراكز التكلفة.",
    },
    {
        href: "/accounting/reports/general-ledger",
        icon: Book,
        iconBg: "bg-indigo-100 group-hover:bg-indigo-600",
        iconColor: "text-indigo-600 group-hover:text-white",
        title: "دفتر الأستاذ العام",
        description: "تفاصيل حركة كل حساب ورصيده التراكمي.",
    },
    {
        href: "/accounting/reports/partner-ledger",
        icon: Users,
        iconBg: "bg-purple-100 group-hover:bg-purple-600",
        iconColor: "text-purple-600 group-hover:text-white",
        title: "كشف حساب",
        description: "كشوف حسابات العملاء والموردين.",
    },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/accounting" className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
                    <p className="text-gray-600 mt-1">القوائم المالية والتحليلات التفصيلية</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => {
                    const Icon = report.icon;
                    return (
                        <Link key={report.href} href={report.href} className="block group">
                            <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition h-full">
                                <div className={`w-12 h-12 ${report.iconBg} rounded-lg flex items-center justify-center mb-4 transition-colors`}>
                                    <Icon className={`w-6 h-6 ${report.iconColor} transition-colors`} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h3>
                                <p className="text-gray-600 text-sm">{report.description}</p>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
