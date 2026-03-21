import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { query, execute, generateUUID } from "@/lib/db";

// POST /api/unit-readiness/merge
// Body: { unit_ids: string[] }
export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json().catch(() => null);
    const unitIds: string[] | undefined = body?.unit_ids;

    if (!unitIds || !Array.isArray(unitIds) || unitIds.length < 2) {
      return NextResponse.json(
        { error: "يجب اختيار وحدتين على الأقل للدمج" },
        { status: 400 }
      );
    }

    // Fetch selected units
    const placeholders = unitIds.map(() => "?").join(",");
    const units = await query<{
      id: string;
      readiness_group_id: string | null;
      readiness_status: string | null;
      readiness_checkout_date: string | null;
      readiness_checkin_date: string | null;
      readiness_guest_name: string | null;
      readiness_notes: string | null;
    }>(
      `SELECT id, readiness_group_id, readiness_status, readiness_checkout_date, 
              readiness_checkin_date, readiness_guest_name, readiness_notes
       FROM units WHERE id IN (${placeholders})`,
      unitIds
    );

    if (units.length < 2) {
      return NextResponse.json(
        { error: "لم يتم العثور على الوحدات المطلوبة" },
        { status: 404 }
      );
    }

    // Validation: don't allow merging units from different groups
    const distinctGroupIds = Array.from(
      new Set(
        units.map((u) => u.readiness_group_id).filter((g) => g !== null)
      )
    );

    if (distinctGroupIds.length > 1) {
      return NextResponse.json(
        { error: "لا يمكن دمج وحدات تنتمي إلى مجموعات جاهزية مختلفة. رجاء فك الدمج أولاً." },
        { status: 400 }
      );
    }

    // Determine group id
    let groupId =
      (distinctGroupIds[0] as string | undefined) ||
      units.find((u) => u.readiness_group_id)?.readiness_group_id ||
      generateUUID();

    // Choose source unit for state
    const sourceUnit = units.find((u) => u.readiness_status) || units[0];

    // Update all units in batch
    await execute(
      `UPDATE units SET 
        readiness_group_id = ?, readiness_status = ?, readiness_checkout_date = ?,
        readiness_checkin_date = ?, readiness_guest_name = ?, readiness_notes = ?
       WHERE id IN (${placeholders})`,
      [
        groupId,
        sourceUnit.readiness_status || null,
        sourceUnit.readiness_checkout_date || null,
        sourceUnit.readiness_checkin_date || null,
        sourceUnit.readiness_guest_name || null,
        sourceUnit.readiness_notes || null,
        ...unitIds,
      ]
    );

    return NextResponse.json({
      success: true,
      group_id: groupId,
      unit_ids: unitIds,
    });
  } catch (error: any) {
    console.error("Error in POST /api/unit-readiness/merge:", error);
    return NextResponse.json(
      { error: error?.message || "Unexpected error merging units" },
      { status: 500 }
    );
  }
}
