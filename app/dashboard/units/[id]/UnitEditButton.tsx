"use client";

import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";

export function UnitEditButton({ unitId }: { unitId: string }) {
  const canEdit = usePermission("edit");

  if (canEdit === null || !canEdit) {
    return null;
  }

  return (
    <Link
      href={`/dashboard/units/${unitId}/edit`}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
    >
      تعديل
    </Link>
  );
}


