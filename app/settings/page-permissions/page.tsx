"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Building2, Calculator, Users, LucideIcon } from "lucide-react";

const systemTabs: { id: string; label: string; icon: LucideIcon }[] = [
    { id: "rentals", label: "نظام التأجير", icon: Building2 },
    { id: "accounting", label: "النظام المالي", icon: Calculator },
    { id: "hr", label: "الموارد البشرية", icon: Users },
];

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: Record<string, { can_view: boolean; can_edit: boolean }>;
}

interface Page {
    path: string;
    label: string;
}

export default function PagePermissionsPage() {
    const [activeSystem, setActiveSystem] = useState("rentals");
    const [data, setData] = useState<{ users: User[]; pages: Page[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const res = await fetch(`/api/settings/page-permissions?system=${activeSystem}`);
        if (res.ok) setData(await res.json());
        setLoading(false);
    }, [activeSystem]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function togglePermission(userId: string, pagePath: string, currentValue: boolean) {
        setSaving(`${userId}-${pagePath}`);

        await fetch("/api/settings/page-permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, page_path: pagePath, can_view: !currentValue }),
        });

        // Optimistic update
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                users: prev.users.map((u) =>
                    u.id === userId
                        ? {
                            ...u,
                            permissions: {
                                ...u.permissions,
                                [pagePath]: { can_view: !currentValue, can_edit: false },
                            },
                        }
                        : u
                ),
            };
        });
        setSaving(null);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">صلاحيات الصفحات للمستخدمين</h1>
                <p className="text-gray-600 mt-1">حدد أي صفحات يمكن لكل مستخدم رؤيتها داخل كل نظام</p>
            </div>

            {/* System Tabs */}
            <div className="flex gap-2 border-b pb-4">
                {systemTabs.map((sys) => {
                    const Icon = sys.icon;
                    return (
                        <button
                            key={sys.id}
                            onClick={() => setActiveSystem(sys.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${activeSystem === sys.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{sys.label}</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">جاري التحميل...</div>
            ) : !data || data.users.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center text-yellow-700">
                    <p className="font-medium">لا يوجد مستخدمين مسموح لهم بالوصول لهذا النظام</p>
                    <p className="text-sm mt-1">يرجى تفعيل صلاحية الوصول للنظام أولاً من صفحة &quot;صلاحيات الأدوار&quot;</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {data.users.map((user) => (
                        <div key={user.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">{user.name}</h3>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                                <span className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-sm">
                                    {user.role}
                                </span>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {data.pages.map((page) => {
                                        const canView = user.permissions[page.path]?.can_view || false;
                                        const isSaving = saving === `${user.id}-${page.path}`;

                                        return (
                                            <button
                                                key={page.path}
                                                onClick={() => togglePermission(user.id, page.path, canView)}
                                                disabled={isSaving}
                                                className={`flex items-center gap-2 p-3 rounded-lg border transition text-right ${canView
                                                        ? "bg-green-50 border-green-200 text-green-700"
                                                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                                                    }`}
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${canView ? "bg-green-500 text-white" : "bg-gray-300 text-white"
                                                        }`}
                                                >
                                                    {isSaving ? "⋯" : canView ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                </div>
                                                <span className="text-sm font-medium truncate">{page.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>ملاحظة:</strong> الصفحات المفعلة ستظهر للمستخدم في القائمة الجانبية. التغييرات تُحفظ تلقائياً.
            </div>
        </div>
    );
}
