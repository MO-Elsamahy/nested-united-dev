"use client";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";
import { SidebarItem } from "./SidebarItem";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { NavSection, NavItem } from "@/lib/navigation-config";
import { LucideIcon } from "lucide-react";

function isNavItemVisibleForUser(item: NavItem, userRole: string): boolean {
    if (item.requiresSuperAdmin && userRole !== "super_admin") return false;
    if (item.allowedRoles?.length) return item.allowedRoles.includes(userRole);
    return true;
}

interface AppSidebarProps {
    user: User | { name: string; role: string; email?: string; id?: string };
    sections: NavSection[];
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
    header,
    isLoading = false,
    className,
}: AppSidebarProps) {
    // Cast user to the expected type for Footer if needed,
    // or ensure the types match. accessing props safely.
    // The SidebarFooter expects a User object, so we might need to conform to that.
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
                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    sections.map((section, sectionIdx) => {
                        const visibleItems = section.items.filter((item) =>
                            isNavItemVisibleForUser(item, user.role)
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
