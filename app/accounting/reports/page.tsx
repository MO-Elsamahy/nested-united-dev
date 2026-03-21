import Link from "next/link";
import { FileBarChart, Book, Users, ArrowRight } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/accounting" className="p-2 hover:bg-slate-100 rounded-full">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">التقارير المالية</h1>
                    <p className="text-gray-600 mt-1">المخرجات والتحليلات</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Trial Balance */}
                <Link href="/accounting/reports/trial-balance" className="block group">
                    <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition h-full">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                            <FileBarChart className="w-6 h-6 text-blue-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">ميزان المراجعة</h3>
                        <p className="text-gray-600 text-sm">أرصدة جميع الحسابات ومطابقتها (Trial Balance).</p>
                    </div>
                </Link>

                {/* General Ledger */}
                <Link href="/accounting/reports/general-ledger" className="block group">
                    <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition h-full">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600 transition-colors">
                            <Book className="w-6 h-6 text-indigo-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">دفتر الأستاذ العام</h3>
                        <p className="text-gray-600 text-sm">تفاصيل حركة كل حساب ورصيده التراكمي.</p>
                    </div>
                </Link>

                {/* Partner Ledger */}
                <Link href="/accounting/reports/partner-ledger" className="block group">
                    <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition h-full">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                            <Users className="w-6 h-6 text-purple-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">كشف حساب</h3>
                        <p className="text-gray-600 text-sm">كشوف حسابات العملاء والموردين.</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
