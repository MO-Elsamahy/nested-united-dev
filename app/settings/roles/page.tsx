"use client";

import { useState, useEffect } from "react";
import {
    Check,
    X,
    Shield,
    Users,
    Calculator,
    Building2,
    Wrench,
    UserCheck,
    LucideIcon,
    Users2,
} from "lucide-react";

interface SystemInfo {
    label: string;
    icon: LucideIcon;
}

interface RoleInfo {
    label: string;
    icon: LucideIcon;
}

const systemLabels: Record<string, SystemInfo> = {
    rentals: { label: "إدارة التأجير", icon: Building2 },
    accounting: { label: "النظام المالي", icon: Calculator },
    hr: { label: "الموارد البشرية", icon: Users },
    crm: { label: "إدارة العملاء (CRM)", icon: Users2 },
};

const roleLabels: Record<string, RoleInfo> = {
    super_admin: { label: "مدير عام", icon: Shield },
    admin: { label: "مشرف", icon: UserCheck },
    accountant: { label: "محاسب", icon: Calculator },
    hr_manager: { label: "موارد بشرية", icon: Users },
    maintenance_worker: { label: "صيانة", icon: Wrench },
    employee: { label: "موظف", icon: UserCheck },
};

function SystemIcon({ systemId }: { systemId: string }) {
    const Icon = systemLabels[systemId]?.icon;
    if (!Icon) return null;
    return <Icon className="w-5 h-5" />;
}

function RoleIcon({ role }: { role: string }) {
    const Icon = roleLabels[role]?.icon;
    if (!Icon) return null;
    return (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-gray-600" />
        </div>
    );
}

export default function RolePermissionsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchPermissions();
    }, []);

    async function fetchPermissions() {
        const res = await fetch("/api/settings/role-permissions");
        if (res.ok) setData(await res.json());
        setLoading(false);
    }

    async function togglePermission(role: string, system: string, currentValue: boolean) {
        if (role === "super_admin") return;
        setSaving(`${role}-${system}`);
        const next = !currentValue;

        try {
            const res = await fetch("/api/settings/role-permissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role, system_id: system, can_access: next }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(
                    typeof (body as { error?: string }).error === "string"
                        ? (body as { error: string }).error
                        : "تعذّر حفظ الصلاحية"
                );
                await fetchPermissions();
                return;
            }

            setData((prev: any) => ({
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [role]: {
                        ...prev.permissions[role],
                        [system]: next,
                    },
                },
            }));
        } catch {
            alert("خطأ في الاتصال أثناء حفظ الصلاحية");
            await fetchPermissions();
        } finally {
            setSaving(null);
        }
    }

    if (loading) return <div className="p-8 text-center">جاري التحميل...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">خطأ في تحميل البيانات</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">تعريف صلاحيات الأدوار</h1>
                <p className="text-gray-600 mt-1">حدد أي نظام يمكن لكل دور الوصول إليه من البوابة</p>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-4 text-right font-medium text-gray-600">الدور</th>
                            {data.systems.map((sys: string) => (
                                <th key={sys} className="px-6 py-4 text-center font-medium text-gray-600">
                                    <div className="flex flex-col items-center gap-1">
                                        <SystemIcon systemId={sys} />
                                        <span>{systemLabels[sys]?.label || sys}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.roles.map((role: string) => (
                            <tr key={role} className={role === "super_admin" ? "bg-purple-50" : "hover:bg-gray-50"}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <RoleIcon role={role} />
                                        <span className="font-medium">{roleLabels[role]?.label || role}</span>
                                        {role === "super_admin" && (
                                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">لا يمكن تعديله</span>
                                        )}
                                    </div>
                                </td>
                                {data.systems.map((sys: string) => {
                                    const canAccess = data.permissions[role]?.[sys] || false;
                                    const isSaving = saving === `${role}-${sys}`;
                                    const isSuper = role === "super_admin";

                                    return (
                                        <td key={sys} className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => togglePermission(role, sys, canAccess)}
                                                disabled={isSuper || isSaving}
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center transition mx-auto ${canAccess
                                                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                                                    : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                    } ${isSuper ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                                {isSaving ? (
                                                    <span className="animate-spin">⋯</span>
                                                ) : canAccess ? (
                                                    <Check className="w-5 h-5" />
                                                ) : (
                                                    <X className="w-5 h-5" />
                                                )}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>ملاحظة:</strong> التغييرات تُحفظ تلقائياً. سيرى المستخدمون التحديثات عند تسجيل دخولهم القادم.
            </div>
        </div>
    );
}
