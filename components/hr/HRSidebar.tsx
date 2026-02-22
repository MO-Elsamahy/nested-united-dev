"use client";

import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Users } from "lucide-react";
import { HR_NAV } from "@/lib/navigation-config";

export function HRSidebar({ user }: { user: { name: string; role: string } }) {
    return (
        <UnifiedSidebar
            user={user}
            sections={HR_NAV}
            header={{
                title: "الموارد البشرية",
                subtitle: "HR Management",
                icon: Users,
                iconColorClass: "bg-violet-600"
            }}
        />
    );
}
