"use client";

import { DeleteUnitButton } from "./DeleteUnitButton";
import { usePermission } from "@/lib/hooks/usePermission";

export function UnitsDeleteButton({ unitId, unitName }: { unitId: string; unitName: string }) {
  const canEdit = usePermission("edit");

  if (canEdit === null || !canEdit) {
    return null;
  }

  return <DeleteUnitButton unitId={unitId} unitName={unitName} />;
}


