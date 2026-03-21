import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CRMPage() {
    const customers = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM customers WHERE status != 'archived'");
    const activeDeals = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM crm_deals WHERE status = 'open'");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">لوحة تحكم المبيعات</h1>
                <p className="text-gray-500">نظرة عامة على أداء العملاء والصفقات</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-sm font-medium">إجمالي العملاء</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{customers?.count || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
                    <h3 className="text-gray-500 text-sm font-medium">صفقات نشطة</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{activeDeals?.count || 0}</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
                <h2 className="text-xl font-bold text-blue-800 mb-2">مرحباً بك في نظام إدارة العملاء</h2>
                <p className="text-blue-600">يمكنك البدء بإضافة عملاء جدد أو إنشاء صفقات لمتابعة المبيعات.</p>
            </div>
        </div>
    );
}
