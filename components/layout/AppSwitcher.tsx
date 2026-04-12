"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { LayoutGrid, Building2, Calculator, UserCog, Users2, Settings, Users } from "lucide-react";

import { User } from "@/lib/types/database";
import { AppFeatures } from "@/lib/features";

interface AppSwitcherProps {
    features?: AppFeatures;
    user?: User | null;
}

export function AppSwitcher({ features, user }: AppSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const role = user?.role;
    const isSuperAdmin = role === "super_admin";
    const isHRAdmin = isSuperAdmin; // HR management: super_admin only
    const isAccountant = isSuperAdmin || role === "admin" || role === "accountant";
    const isCRMUser = isSuperAdmin || role === "admin";

    const apps = [
        { id: "rentals",    name: "إدارة التأجير",         icon: Building2, href: "/dashboard", color: "text-blue-600",    show: true },
        { id: "accounting", name: "النظام المالي",          icon: Calculator, href: "/accounting", color: "text-emerald-600", show: isAccountant },
        { id: "hr",         name: "الموارد البشرية",        icon: UserCog,   href: "/hr",        color: "text-violet-600", show: isHRAdmin },
        { id: "employee",   name: "بوابة الموظف",           icon: Users,     href: "/employee",  color: "text-orange-600", show: true },
        { id: "crm",        name: "إدارة العملاء",          icon: Users2,    href: "/crm",       color: "text-indigo-600", show: isCRMUser },
        { id: "settings",   name: "الإعدادات",              icon: Settings,  href: "/settings",  color: "text-gray-600",   show: isSuperAdmin },
    ].filter(app => {
        // 1. Role-based visibility
        if (!app.show) return false;

        // 2. Feature flag check
        if (!features) return true;
        switch (app.id) {
            case "accounting": return features.accounting;
            case "hr":         return features.hr;
            case "crm":        return features.crm;
            case "rentals":    return features.rentals;
            default:           return true;
        }
    });

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="التطبيقات"
            >
                <LayoutGrid className="w-6 h-6" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50">
                    <div className="grid grid-cols-2 gap-2">
                        {apps.map((app) => (
                            <Link
                                key={app.href}
                                href={app.href}
                                className="flex flex-col items-center justify-center p-3 rounded-lg hover:bg-gray-50 transition-colors gap-2 text-center"
                                onClick={() => setIsOpen(false)}
                            >
                                <div className={`p-2 rounded-lg ${app.color.replace('text-', 'bg-')}/10`}>
                                    <app.icon className={`w-6 h-6 ${app.color}`} />
                                </div>
                                <span className="text-xs font-medium text-gray-700">{app.name}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
