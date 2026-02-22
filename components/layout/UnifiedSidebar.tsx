"use client";

import { cn } from "@/lib/utils";
import type { User } from "@/lib/types/database";
import { SidebarItem } from "./SidebarItem";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarFooter } from "./SidebarFooter";
import { NavSection } from "@/lib/navigation-config";

interface AppSidebarProps {
    user: User | { name: string; role: string; email?: string; id?: string };
    sections: NavSection[];
    header: {
        title: string;
        subtitle: string;
        icon: any;
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
                "bg-white border-l border-gray-200 min-h-screen flex flex-col w-64 flex-shrink-0 hidden md:flex",
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
                        // Filter out empty sections if any
                        if (section.items.length === 0) return null;

                        return (
                            <div key={sectionIdx} className="mb-4">
                                {section.title && (
                                    <div className="px-3 pt-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                        {section.title}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {section.items.map((item) => (
                                        <SidebarItem key={item.href} {...item} />
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
