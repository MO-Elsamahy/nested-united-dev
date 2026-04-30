import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";

// GET /api/units/[id]/readiness - Get readiness status for a specific unit
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const unit = await queryOne(
      `SELECT id, readiness_status, readiness_checkout_date, readiness_checkin_date,
              readiness_guest_name, readiness_notes, readiness_updated_by, readiness_updated_at
       FROM units WHERE id = ?`,
      [id]
    );

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    return NextResponse.json(unit);
  } catch (error: unknown) {
    console.error("Error in GET /api/units/[id]/readiness:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error fetching unit readiness" },
      { status: 500 }
    );
  }
}

// PUT /api/units/[id]/readiness - Update readiness status for a unit
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    // Admins + maintenance workers can update readiness
    if (
      !currentUser ||
      !(isAdmin(currentUser) || currentUser.role === "maintenance_worker")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, checkout_date, checkin_date, guest_name, notes } = body;

    // Validate status
    const validStatuses = [
      "checkout_today",
      "checkin_today",
      "guest_not_checked_out",
      "awaiting_cleaning",
      "cleaning_in_progress",
      "ready",
      "occupied",
      "booked",
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check if unit exists and get readiness_group_id
    const unit = await queryOne<{ id: string; readiness_group_id: string | null }>(
      "SELECT id, readiness_group_id FROM units WHERE id = ?",
      [id]
    );

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    if (unit.readiness_group_id) {
      // Update all units in the group
      await execute(
        `UPDATE units SET 
          readiness_status = ?, readiness_checkout_date = ?, readiness_checkin_date = ?,
          readiness_guest_name = ?, readiness_notes = ?, readiness_updated_by = ?, readiness_updated_at = NOW()
         WHERE readiness_group_id = ?`,
        [
          status,
          checkout_date || null,
          checkin_date || null,
          guest_name || null,
          notes || null,
          currentUser.id,
          unit.readiness_group_id,
        ]
      );
    } else {
      // Update only this unit
      await execute(
        `UPDATE units SET 
          readiness_status = ?, readiness_checkout_date = ?, readiness_checkin_date = ?,
          readiness_guest_name = ?, readiness_notes = ?, readiness_updated_by = ?, readiness_updated_at = NOW()
         WHERE id = ?`,
        [
          status,
          checkout_date || null,
          checkin_date || null,
          guest_name || null,
          notes || null,
          currentUser.id,
          id,
        ]
      );
    }

    const updatedUnit = await queryOne(
      "SELECT * FROM units WHERE id = ?",
      [id]
    );

    return NextResponse.json(updatedUnit);
  } catch (error: unknown) {
    console.error("Error in PUT /api/units/[id]/readiness:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error updating unit readiness" },
      { status: 500 }
    );
  }
}
