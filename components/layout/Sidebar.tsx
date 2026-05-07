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


    return (
        <UnifiedSidebar
            user={user}
            sections={DASHBOARD_NAV}
            permissions={permissions}
            features={features}
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
