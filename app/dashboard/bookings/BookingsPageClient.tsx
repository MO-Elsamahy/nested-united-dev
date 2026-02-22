"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";

export function BookingsPageClient() {
  // Check edit permission specifically for bookings page
  const canEdit = usePermission("edit", "/dashboard/bookings");

  if (canEdit === null || !canEdit) {
    return null;
  }

  return (
    <Link
      href="/dashboard/bookings/new"
      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
    >
      <Plus className="w-4 h-4" />
      إضافة حجز
    </Link>
  );
}


