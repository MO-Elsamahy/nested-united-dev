export default function SettingsDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">الإعدادات العامة للنظام</h1>
            <p className="text-gray-600">تحكم في الصلاحيات والمستخدمين لكافة الأنظمة (مالية، تأجير، موارد بشرية).</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg mb-2">إدارة الهوية (Identity)</h3>
                    <p className="text-sm text-gray-500 mb-4">إضافة مستخدمين جدد وتوزيع الأدوار.</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li>إنشاء حسابات محاسبين</li>
                        <li>إنشاء حسابات موظفي استقبال</li>
                        <li>إعادة تعيين كلمات المرور</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
