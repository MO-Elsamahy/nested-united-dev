"use client";

import { PieChart } from "lucide-react";
import type { User } from "@/lib/types/database";
import { ANALYTICS_NAV } from "@/lib/navigation-config";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { AppFeatures } from "@/lib/features";

interface AnalyticsSidebarProps {
    user: User;
    features: AppFeatures;
}

export function AnalyticsSidebar({ user, features }: AnalyticsSidebarProps) {
    return (
        <UnifiedSidebar
            user={user}
            sections={ANALYTICS_NAV}
            features={features}
            header={{
                title: "التحليلات المتقدمة",
                subtitle: "Advanced Analytics",
                icon: PieChart,
                iconColorClass: "bg-teal-600",
            }}
        />
    );
}
