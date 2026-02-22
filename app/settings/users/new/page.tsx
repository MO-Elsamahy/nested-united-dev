"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NewUserPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.currentTarget);
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (password !== confirmPassword) {
            setError("كلمة المرور غير متطابقة");
            setLoading(false);
            return;
        }

        const data = {
            email: formData.get("email"),
            password,
            name: formData.get("name"),
            role: formData.get("role"),
        };

        try {
            const response = await fetch("/api/users/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "حدث خطأ");
            }

            router.push("/settings/users");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/settings/users" className="p-2 hover:bg-gray-100 rounded-lg">
                    <ArrowRight className="w-6 h-6" />
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">إضافة مستخدم جديد</h1>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الاسم *</label>
                        <input type="text" name="name" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="الاسم الكامل" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني *</label>
                        <input type="email" name="email" required className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="email@example.com" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الدور *</label>
                        <select name="role" required className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                            <option value="">اختر الدور</option>
                            <option value="admin">مشرف (Admin)</option>
                            <option value="super_admin">مدير عام (Super Admin)</option>
                            <option value="accountant">محاسب (Accountant)</option>
                            <option value="hr_manager">مدير موارد بشرية (HR Manager)</option>
                            <option value="maintenance_worker">عامل صيانة (Maintenance)</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-1">
                            المحاسب يرى النظام المالي فقط. عامل الصيانة يرى التذاكر فقط.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور *</label>
                        <input type="password" name="password" required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••••" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">تأكيد كلمة المرور *</label>
                        <input type="password" name="confirmPassword" required minLength={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="••••••••" />
                    </div>

                    <div className="flex gap-4">
                        <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                            {loading ? "جاري الإنشاء..." : "إنشاء المستخدم"}
                        </button>
                        <Link href="/settings/users" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
                            إلغاء
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
