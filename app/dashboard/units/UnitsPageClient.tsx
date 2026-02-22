"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";

export function UnitsPageClient() {
  const canEdit = usePermission("edit");

  if (canEdit === null) {
    return null; // Loading
  }

  if (!canEdit) {
    return null; // No permission to show button
  }

  return (
    <Link
      href="/dashboard/units/new"
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
    >
      <Plus className="w-5 h-5" />
      <span>إضافة وحدة</span>
    </Link>
  );
}


