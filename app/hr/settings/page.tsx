"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Settings, DollarSign, Clock, FileText } from "lucide-react";

export default function HRSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for all settings
    const [settings, setSettings] = useState({
        // Work & Attendance
        working_days_per_month: "22",
        work_start_time: "08:00",
        work_end_time: "17:00",
        late_grace_minutes: "15",

        // Payroll Formulas
        overtime_rate: "1.5",
        gosi_employee_rate: "9.75",
        gosi_company_rate: "11.75",
        housing_allowance_percent: "25",
        transport_allowance_percent: "10",

        // Accounting Integration
        salary_journal_id: "",
        salary_expense_account_id: "",
        salary_payable_account_id: "",
    });

    const [accounts, setAccounts] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            fetch("/api/hr/settings").then(res => res.json()),
            fetch("/api/accounting/accounts").then(res => res.json()).catch(() => []),
            fetch("/api/accounting/journals").then(res => res.json()).catch(() => [])
        ]).then(([settingsData, accountsData, journalsData]) => {
            setSettings(prev => ({ ...prev, ...settingsData }));
            setAccounts(Array.isArray(accountsData) ? accountsData : []);
            setJournals(Array.isArray(journalsData) ? journalsData : []);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch("/api/hr/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                alert("تم حفظ الإعدادات بنجاح");
            } else {
                alert("حدث خطأ أثناء الحفظ");
            }
        } catch (error) {
            alert("خطأ في الاتصال");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">جاري تحميل الإعدادات...</div>;

    return (
        <div className="w-full space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">إعدادات الموارد البشرية</h1>
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-xl font-medium transition disabled:opacity-50"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ التغييرات
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Attendance Settings */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">الدوام والحضور</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">أيام العمل في الشهر</label>
                            <input
                                type="number"
                                name="working_days_per_month"
                                value={settings.working_days_per_month || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-400 mt-1">يستخدم لحساب أجر اليوم وغياب الموظف</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">وقت الحضور</label>
                                <input
                                    type="time"
                                    name="work_start_time"
                                    value={settings.work_start_time || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    dir="ltr"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">وقت الانصراف</label>
                                <input
                                    type="time"
                                    name="work_end_time"
                                    value={settings.work_end_time || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg"
                                    dir="ltr"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">فترة سماح التأخير (دقيقة)</label>
                            <input
                                type="number"
                                name="late_grace_minutes"
                                value={settings.late_grace_minutes || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* Payroll Formulas */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">معادلات الرواتب</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">معدل الإضافي (للساعة)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="overtime_rate"
                                    value={settings.overtime_rate || ""}
                                    onChange={handleChange}
                                    step="0.1"
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                                <span className="absolute left-3 top-2 text-gray-400 text-sm">x</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة التأمينات (موظف) %</label>
                                <input
                                    type="number"
                                    name="gosi_employee_rate"
                                    value={settings.gosi_employee_rate || ""}
                                    onChange={handleChange}
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة التأمينات (شركة) %</label>
                                <input
                                    type="number"
                                    name="gosi_company_rate"
                                    value={settings.gosi_company_rate || ""}
                                    onChange={handleChange}
                                    step="0.01"
                                    className="w-full px-4 py-2 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Accounting Integration */}
                <div className="bg-white rounded-xl shadow-sm border p-6 md:col-span-2">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-violet-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">الربط المحاسبي</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">يومية الرواتب</label>
                            <select
                                name="salary_journal_id"
                                value={settings.salary_journal_id || ""}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg bg-white"
                            >
                                <option value="">اختر اليومية...</option>
                                {journals.map(j => (
                                    <option key={j.id} value={j.id}>{j.name} ({j.code})</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">سيتم إنشاء قيود الرواتب في هذه اليومية</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب مصروف الرواتب (Debit)</label>
                                <select
                                    name="salary_expense_account_id"
                                    value={settings.salary_expense_account_id || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-white"
                                >
                                    <option value="">اختر الحساب...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">حساب رواتب مستحقة الدفع (Credit)</label>
                                <select
                                    name="salary_payable_account_id"
                                    value={settings.salary_payable_account_id || ""}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg bg-white"
                                >
                                    <option value="">اختر الحساب...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
