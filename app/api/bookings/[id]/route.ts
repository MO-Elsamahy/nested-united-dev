import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET /api/bookings/[id] - Get single booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;

  try {
    const booking = await queryOne(
      "SELECT * FROM bookings WHERE id = ?",
      [resolvedParams.id]
    );

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(currentUser.id, "/dashboard/bookings", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية التعديل" }, { status: 403 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const body = await request.json();
  const {
    unit_id,
    platform_account_id,
    platform,
    guest_name,
    phone,
    checkin_date,
    checkout_date,
    amount,
    currency,
    notes,
  } = body;

  if (!guest_name || !checkin_date || !checkout_date || !unit_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    // Get booking before update for logging
    const oldBooking = await queryOne<{ guest_name: string }>(
      "SELECT guest_name FROM bookings WHERE id = ?",
      [resolvedParams.id]
    );

    await execute(
      `UPDATE bookings SET 
        unit_id = ?, platform_account_id = ?, platform = ?, guest_name = ?, 
        phone = ?, checkin_date = ?, checkout_date = ?, amount = ?, currency = ?, notes = ?
       WHERE id = ?`,
      [
        unit_id,
        platform_account_id || null,
        platform || null,
        guest_name,
        phone || null,
        checkin_date,
        checkout_date,
        amount || null,
        currency || "SAR",
        notes || null,
        resolvedParams.id,
      ]
    );

    const updatedBooking = await queryOne(
      "SELECT * FROM bookings WHERE id = ?",
      [resolvedParams.id]
    );

    // Log activity
    await logActivityInServer({
      userId: currentUser.id,
      action_type: "update",
      page_path: "/dashboard/bookings",
      resource_type: "booking",
      resource_id: resolvedParams.id,
      description: `تحديث حجز: ${oldBooking?.guest_name || guest_name}`,
      metadata: { booking_id: resolvedParams.id, guest_name },
    });

    return NextResponse.json(updatedBooking);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/bookings/[id] - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(currentUser.id, "/dashboard/bookings", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الحذف" }, { status: 403 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;

  try {
    // Get booking before delete for logging
    const booking = await queryOne<{ guest_name: string }>(
      "SELECT guest_name FROM bookings WHERE id = ?",
      [resolvedParams.id]
    );

    await execute("DELETE FROM bookings WHERE id = ?", [resolvedParams.id]);

    // Log activity
    await logActivityInServer({
      userId: currentUser.id,
      action_type: "delete",
      page_path: "/dashboard/bookings",
      resource_type: "booking",
      resource_id: resolvedParams.id,
      description: `حذف حجز: ${booking?.guest_name || resolvedParams.id}`,
      metadata: { booking_id: resolvedParams.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
