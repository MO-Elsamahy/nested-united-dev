"use client";

import { useState, useEffect } from "react";
import { Upload, Save, Building2 } from "lucide-react";

export default function CompanySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>({
        company_name: "",
        company_name_en: "",
        email: "",
        phone: "",
        mobile: "",
        website: "",
        address: "",
        city: "",
        country: "Saudi Arabia",
        postal_code: "",
        tax_number: "",
        commercial_registration: "",
        default_payment_terms: "Net 30",
        invoice_footer: "",
        bank_name: "",
        bank_account: "",
        iban: "",
        logo_url: "",
        invoice_type_label: "فاتورة ضريبية",
        invoice_terms: "",
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const res = await fetch("/api/accounting/company-settings");
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/accounting/company-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                alert("تم حفظ الإعدادات بنجاح");
            } else {
                const error = await res.json();
                alert(`خطأ: ${error.error}`);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // For now, just store the file name. In production, upload to storage
        const reader = new FileReader();
        reader.onloadend = () => {
            setSettings({ ...settings, logo_url: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    if (loading) {
        return <div className="p-8 text-center">جاري التحميل...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">معلومات الشركة</h1>
                <p className="text-gray-600 mt-1">إعدادات الشركة والفواتير</p>
            </div>

            {/* Company Logo */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">شعار الشركة</h2>
                <div className="flex items-center gap-6">
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden">
                        {settings.logo_url ? (
                            <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        ) : (
                            <Building2 className="w-12 h-12 text-gray-300" />
                        )}
                    </div>
                    <div>
                        <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            <span>رفع الشعار</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">PNG, JPG (أقصى حجم: 2MB)</p>
                    </div>
                </div>
            </div>

            {/* Company Information */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">معلومات الشركة</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">اسم الشركة (عربي) *</label>
                        <input
                            required
                            type="text"
                            value={settings.company_name}
                            onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">اسم الشركة (English)</label>
                        <input
                            type="text"
                            value={settings.company_name_en || ""}
                            onChange={(e) => setSettings({ ...settings, company_name_en: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
                        <input
                            type="email"
                            value={settings.email || ""}
                            onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الهاتف</label>
                        <input
                            type="tel"
                            value={settings.phone || ""}
                            onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الموقع الإلكتروني</label>
                        <input
                            type="url"
                            value={settings.website || ""}
                            onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">المدينة</label>
                        <input
                            type="text"
                            value={settings.city || ""}
                            onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">العنوان</label>
                        <textarea
                            rows={2}
                            value={settings.address || ""}
                            onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Tax Information */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">المعلومات الضريبية والقانونية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">رقم السجل الضريبي (VAT)</label>
                        <input
                            type="text"
                            value={settings.tax_number || ""}
                            onChange={(e) => setSettings({ ...settings, tax_number: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="3001234567800003"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">رقم السجل التجاري</label>
                        <input
                            type="text"
                            value={settings.commercial_registration || ""}
                            onChange={(e) => setSettings({ ...settings, commercial_registration: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Banking Information */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">المعلومات البنكية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">اسم البنك</label>
                        <input
                            type="text"
                            value={settings.bank_name || ""}
                            onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">رقم الحساب</label>
                        <input
                            type="text"
                            value={settings.bank_account || ""}
                            onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">IBAN</label>
                        <input
                            type="text"
                            value={settings.iban || ""}
                            onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="SA00 0000 0000 0000 0000 0000"
                        />
                    </div>
                </div>
            </div>

            {/* Invoice Settings */}
            <div className="bg-white p-6 rounded-xl border shadow-sm">
                <h2 className="text-lg font-bold mb-4">إعدادات الفواتير</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">شروط الدفع الافتراضية</label>
                        <input
                            type="text"
                            value={settings.default_payment_terms || ""}
                            onChange={(e) => setSettings({ ...settings, default_payment_terms: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Net 30"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">مسمى الفاتورة (مثلاً: فاتورة ضريبية)</label>
                        <input
                            type="text"
                            value={settings.invoice_type_label || ""}
                            onChange={(e) => setSettings({ ...settings, invoice_type_label: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="فاتورة ضريبية"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">الشروط والأحكام (تظهر في أسفل الفاتورة)</label>
                        <textarea
                            rows={4}
                            value={settings.invoice_terms || ""}
                            onChange={(e) => setSettings({ ...settings, invoice_terms: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="أدخل الشروط والأحكام هنا..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">تذييل الفاتورة (نص ترحيبي)</label>
                        <textarea
                            rows={2}
                            value={settings.invoice_footer || ""}
                            onChange={(e) => setSettings({ ...settings, invoice_footer: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="شكراً لتعاملكم معنا..."
                        />
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </button>
            </div>
        </form>
    );
}
