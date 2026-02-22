"use client";

import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { ACCOUNTING_NAV } from "@/lib/navigation-config";
import { Calculator } from "lucide-react";
import type { User } from "@/lib/types/database";

export function AccountingSidebar({ user }: { user: User }) {
    return (
        <UnifiedSidebar
            user={user}
            sections={ACCOUNTING_NAV}
            header={{
                title: "النظام المالي",
                subtitle: "Enterprise ERP",
                icon: Calculator,
                iconColorClass: "bg-emerald-600"
            }}
        />
    );
}
