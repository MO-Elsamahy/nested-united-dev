"use client";

import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Users } from "lucide-react";
import { CRM_NAV } from "@/lib/navigation-config";

export function CRMSidebar({ user }: { user: { name: string; role: string } }) {
    return (
        <UnifiedSidebar
            user={user}
            sections={CRM_NAV}
            header={{
                title: "نظام العملاء",
                subtitle: "CRM & Sales",
                icon: Users,
                iconColorClass: "bg-indigo-600"
            }}
        />
    );
}
