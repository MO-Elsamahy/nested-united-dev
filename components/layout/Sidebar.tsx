"use client";

import { Building2 } from "lucide-react";
import type { User } from "@/lib/types/database";
import { DASHBOARD_NAV } from "@/lib/navigation-config";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { AppFeatures } from "@/lib/features";

interface SidebarProps {
    user: User;
    features: AppFeatures;
}

export function Sidebar({ user, features }: SidebarProps) {
    return (
        <UnifiedSidebar
            user={user}
            sections={DASHBOARD_NAV}
            features={features}
            header={{
                title: "إدارة التأجير",
                subtitle: "Rentals Management",
                icon: Building2,
                iconColorClass: "bg-blue-600",
            }}
        />
    );
}
