import { queryOne, query } from "@/lib/db";
import { TrendingUp, Users, Trophy, Activity, BarChart3, PieChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CRMReportsPage() {
    // Fetch Analytics Data
    const totalCustomers = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM customers WHERE status != 'archived'"
    );

    const totalDeals = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_deals"
    );

    const openDeals = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_deals WHERE status = 'open'"
    );

    const closedDeals = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_deals WHERE status = 'closed'"
    );

    const wonDeals = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_deals WHERE stage = 'won'"
    );

    const lostDeals = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_deals WHERE stage = 'lost'"
    );

    // Deals by Stage
    const dealsByStage = await query<{ stage: string; count: number }>(
        "SELECT stage, COUNT(*) as count FROM crm_deals WHERE status = 'open' GROUP BY stage"
    );

    // Recent Activities
    const recentActivities = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM crm_activities WHERE performed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );

    // Top Customers by Deal Count
    const topCustomers = await query<{ customer_name: string; deal_count: number }>(
        `SELECT c.full_name as customer_name, COUNT(d.id) as deal_count 
         FROM customers c 
         LEFT JOIN crm_deals d ON c.id = d.customer_id 
         GROUP BY c.id, c.full_name 
         HAVING deal_count > 0
         ORDER BY deal_count DESC 
         LIMIT 5`
    );

    // Calculate conversion rate
    const totalCompleted = (wonDeals?.count || 0) + (lostDeals?.count || 0);
    const conversionRate = totalCompleted > 0
        ? Math.round(((wonDeals?.count || 0) / totalCompleted) * 100)
        : 0;

    const stageLabels: Record<string, string> = {
        new: 'جديد',
        contacting: 'جاري التواصل',
        proposal: 'إرسال عرض',
        negotiation: 'تفاوض',
        won: 'تم الاتفاق',
        lost: 'خسارة'
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">تقارير CRM</h1>
                <p className="text-gray-500">تحليلات شاملة لأداء العملاء والصفقات</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">إجمالي العملاء</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{totalCustomers?.count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">الصفقات المفتوحة</p>
                            <p className="text-3xl font-bold text-blue-600 mt-1">{openDeals?.count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">معدل النجاح</p>
                            <p className="text-3xl font-bold text-green-600 mt-1">{conversionRate}%</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {wonDeals?.count || 0} نجحت من أصل {totalCompleted} مكتملة
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">النشاطات (آخر 7 أيام)</p>
                            <p className="text-3xl font-bold text-purple-600 mt-1">{recentActivities?.count || 0}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Activity className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Deals by Stage */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">الصفقات حسب المرحلة</h3>
                    </div>
                    <div className="space-y-3">
                        {dealsByStage && dealsByStage.length > 0 ? (
                            dealsByStage.map((item) => (
                                <div key={item.stage} className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-700">{stageLabels[item.stage] || item.stage}</span>
                                            <span className="font-medium text-gray-900">{item.count}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min((item.count / (openDeals?.count || 1)) * 100, 100)}% ` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">لا توجد بيانات</p>
                        )}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <PieChart className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">أكثر العملاء نشاطاً</h3>
                    </div>
                    <div className="space-y-3">
                        {topCustomers && topCustomers.length > 0 ? (
                            topCustomers.map((customer, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                                            {idx + 1}
                                        </div>
                                        <span className="font-medium text-gray-900">{customer.customer_name}</span>
                                    </div>
                                    <span className="text-sm text-gray-500">{customer.deal_count} صفقات</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-400 text-center py-8">لا توجد بيانات</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h4 className="text-sm font-medium text-green-800 mb-2">صفقات ناجحة</h4>
                    <p className="text-3xl font-bold text-green-900">{wonDeals?.count || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
                    <h4 className="text-sm font-medium text-red-800 mb-2">صفقات خاسرة</h4>
                    <p className="text-3xl font-bold text-red-900">{lostDeals?.count || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">مؤرشفة</h4>
                    <p className="text-3xl font-bold text-gray-900">{closedDeals?.count || 0}</p>
                </div>
            </div>
        </div>
    );
}
