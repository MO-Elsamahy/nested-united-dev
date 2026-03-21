import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { execute } from "@/lib/db";

// POST /api/unit-readiness/unmerge
// Body: { group_id: string } or { unit_ids: string[] }
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json().catch(() => null);
    const groupId: string | undefined = body?.group_id || undefined;
    const unitIds: string[] | undefined = body?.unit_ids;

    if (!groupId && (!unitIds || !Array.isArray(unitIds) || unitIds.length === 0)) {
      return NextResponse.json(
        { error: "يجب إرسال group_id أو قائمة unit_ids" },
        { status: 400 }
      );
    }

    if (unitIds && unitIds.length > 0) {
      const placeholders = unitIds.map(() => "?").join(",");
      await execute(
        `UPDATE units SET readiness_group_id = NULL WHERE id IN (${placeholders})`,
        unitIds
      );
    } else if (groupId) {
      await execute(
        "UPDATE units SET readiness_group_id = NULL WHERE readiness_group_id = ?",
        [groupId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in POST /api/unit-readiness/unmerge:", error);
    return NextResponse.json(
      { error: error?.message || "Unexpected error unmerging units" },
      { status: 500 }
    );
  }
}
