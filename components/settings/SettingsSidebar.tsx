"use client";

import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Settings } from "lucide-react";
import { SETTINGS_NAV } from "@/lib/navigation-config";

export function SettingsSidebar({ user }: { user: { name: string; role: string } }) {
    return (
        <UnifiedSidebar
            user={user}
            sections={SETTINGS_NAV}
            header={{
                title: "الإعدادات",
                subtitle: "Global Admin",
                icon: Settings,
                iconColorClass: "bg-gray-700"
            }}
        />
    );
}
