"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";
import { SidebarItem } from "./SidebarItem";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { NavSection, NavItem } from "@/lib/navigation-config";
import { LucideIcon } from "lucide-react";
import { AppFeatures } from "@/lib/features";

function isNavItemVisibleForUser(
    item: NavItem, 
    userRole: string, 
    permissions: { page_path: string; can_view: boolean }[],
    features?: AppFeatures
): boolean {
    // 1. Feature flag check
    if (features) {
        if (item.href.startsWith("/accounting") && !features.accounting) return false;
        if (item.href.startsWith("/hr") && !features.hr) return false;
        if (item.href.startsWith("/crm") && !features.crm) return false;
        if (item.href.startsWith("/dashboard") && !features.rentals) return false;
    }

    // 2. Super Admin check
    if (item.requiresSuperAdmin && userRole !== "super_admin") return false;
    
    // 3. Database permissions override
    const permission = permissions.find((p) => p.page_path === item.href);
    if (permission) return !!permission.can_view;

    // 4. Fallback to static allowedRoles
    if (item.allowedRoles?.length) return item.allowedRoles.includes(userRole);
    return true;
}

interface AppSidebarProps {
    user: User | { name: string; role: string; email?: string; id?: string };
    sections: NavSection[];
    permissions?: { page_path: string; can_view: boolean }[];
    features?: AppFeatures;
    header: {
        title: string;
        subtitle: string;
        icon: LucideIcon;
        iconColorClass: string;
    };
    isLoading?: boolean;
    className?: string;
}

export function UnifiedSidebar({
    user,
    sections,
    permissions: passedPermissions,
    features,
    header,
    isLoading = false,
    className,
}: AppSidebarProps) {
    const [permissions, setPermissions] = useState<{ page_path: string; can_view: boolean }[]>(passedPermissions || []);
    const [loading, setLoading] = useState(passedPermissions ? isLoading : true);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchPermissions = useCallback(async () => {
        if (!user.id) {
            setLoading(false);
            return;
        }
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
            console.error("Error fetching permissions for sidebar:", error);
        } finally {
            setLoading(false);
        }
    }, [user.id, user.role]);

    useEffect(() => {
        if (passedPermissions) {
            setPermissions(passedPermissions);
            setLoading(isLoading);
            return;
        }
        fetchPermissions();
    }, [fetchPermissions, passedPermissions, isLoading, refreshKey]);

    // Listen for permissions-updated event to refetch
    useEffect(() => {
        const handlePermissionsUpdated = () => {
            setRefreshKey((prev) => prev + 1);
        };
        window.addEventListener("permissions-updated", handlePermissionsUpdated);
        return () => window.removeEventListener("permissions-updated", handlePermissionsUpdated);
    }, []);

    // Cast user to the expected type for Footer if needed
    const userForFooter = user as User;

    return (
        <aside
            className={cn(
                "bg-white border-l border-gray-200 h-full flex flex-col w-64 flex-shrink-0",
                className
            )}
        >
            <SidebarHeader
                title={header.title}
                subtitle={header.subtitle}
                icon={header.icon}
                iconColorClass={header.iconColorClass}
            />

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    sections.map((section, sectionIdx) => {
                        const visibleItems = section.items.filter((item) =>
                            isNavItemVisibleForUser(item, user.role, permissions, features)
                        );
                        if (visibleItems.length === 0) return null;

                        return (
                          <div key={sectionIdx} className="mb-4">
                              {section.title && (
                                  <div className="px-3 pt-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                      {section.title}
                                  </div>
                              )}
                              <div className="space-y-1">
                                  {visibleItems.map((item) => (
                                      <SidebarItem
                                          key={item.href}
                                          label={item.label}
                                          href={item.href}
                                          icon={item.icon}
                                      />
                                  ))}
                              </div>
                          </div>
                        );
                    })
                )}
            </nav>

            <SidebarFooter user={userForFooter} />
        </aside>
    );
}
