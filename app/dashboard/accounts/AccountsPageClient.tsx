"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";
import { useEffect, useState } from "react";

export function AccountsPageClient() {
  const canEdit = usePermission("edit");
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user is super admin via session API
    const checkSuperAdmin = async () => {
      try {
        const response = await fetch("/api/auth/session");
        if (!response.ok) {
          setIsSuperAdmin(false);
          return;
        }
        const session = await response.json();
        setIsSuperAdmin(session?.user?.role === "super_admin");
      } catch {
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, []);

  // Show button if super admin OR if permission check returns true
  if (isSuperAdmin === true || canEdit === true) {
    return (
      <Link
        href="/dashboard/accounts/new"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
      >
        <Plus className="w-5 h-5" />
        <span>إضافة حساب</span>
      </Link>
    );
  }

  // Don't show button if we know user is not super admin and doesn't have permission
  if (isSuperAdmin === false && canEdit === false) {
    return null;
  }

  // Show nothing while checking
  return null;
}


