"use client";
// Force rebuild

import { useState, useEffect, useCallback } from "react";
import { Building2 } from "lucide-react";
import type { User } from "@/lib/types/database";
import { DASHBOARD_NAV } from "@/lib/navigation-config";
import { UnifiedSidebar } from "./UnifiedSidebar";

import { AppFeatures } from "@/lib/features";

interface SidebarProps {
    user: User;
    features: AppFeatures;
}

interface UserPermission {
    page_path: string;
    can_view: boolean;
}

export function Sidebar({ user, features }: SidebarProps) {
    const [permissions, setPermissions] = useState<UserPermission[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Fetch user permissions
    const fetchPermissions = useCallback(async () => {
        try {
            // Super admins have all permissions, no need to fetch
            if (user.role === "super_admin") {
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/users/${user.id}/permissions`, {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setPermissions(data.permissions || []);
            }
        } catch (error) {
            console.error("Error fetching permissions:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.role]);

    // Fetch permissions on mount and when refreshKey changes
    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions, refreshKey]);

    // Listen for permissions-updated event to refetch
    useEffect(() => {
        const handlePermissionsUpdated = () => {
            console.log("Permissions updated, refetching...");
            setRefreshKey((prev) => prev + 1);
        };

        window.addEventListener("permissions-updated", handlePermissionsUpdated);

        return () => {
            window.removeEventListener("permissions-updated", handlePermissionsUpdated);
        };
    }, []);

    // Check if user can view a specific page
    const canViewPage = (href: string): boolean => {
        // Super admins can view everything
        if (user.role === "super_admin") {
            return true;
        }

        // Dashboard home and about are always visible
        if (href === "/dashboard" || href === "/about") {
            return true;
        }

        // Pages that require super admin only
        const superAdminPages = ["/dashboard/users", "/dashboard/activity-logs"];
        if (superAdminPages.includes(href)) {
            return false;
        }

        // For ALL other roles (admin, accountant, hr_manager, maintenance_worker):
        // 1. Check user_permissions table override
        const permission = permissions.find((p) => p.page_path === href);
        if (permission) {
            return !!permission.can_view;
        }

        // 2. Default visibility by role
        const roleDefaults: Record<string, string[]> = {
            admin: ["/dashboard", "/accounting", "/hr", "/crm"],
            accountant: ["/accounting", "/dashboard"],
            hr_manager: ["/hr", "/dashboard"],
            maintenance_worker: ["/dashboard/maintenance", "/dashboard/unit-readiness", "/dashboard"],
            employee: ["/dashboard"],
        };

        const allowedPrefixes = roleDefaults[user.role] || ["/dashboard"];
        const isAllowedByDefault = allowedPrefixes.some(p => href.startsWith(p));

        return isAllowedByDefault;
    };

    // Filter sections and items
    const filteredSections = DASHBOARD_NAV.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
            // 1. Check Feature Flags (Remote Manifest)
            if (
                item.href.startsWith("/dashboard/accounts") &&
                !features.accounting
            )
                return false;
            if (
                item.href.startsWith("/dashboard/hr") &&
                !features.hr
            )
                return false;
            if (
                item.href.startsWith("/dashboard/crm") &&
                !features.crm
            )
                return false;

            // 2. Check Super Admin Requirement
            if (item.requiresSuperAdmin && user.role !== "super_admin") return false;

            // 3. Check Database Permissions
            return canViewPage(item.href);
        }),
    })).filter((section) => section.items.length > 0);

    return (
        <UnifiedSidebar
            user={user}
            sections={filteredSections}
            header={{
                title: "إدارة التأجير",
                subtitle: "Rentals Management",
                icon: Building2,
                iconColorClass: "bg-blue-600",
            }}
            isLoading={loading}
        />
    );
}
