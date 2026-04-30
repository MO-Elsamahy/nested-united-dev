import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";

// GET /api/reservations/[id] - Get single reservation
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
    const reservation = await queryOne(
      `SELECT r.*, u.id as unit_id, u.unit_name, u.platform_account_id
       FROM reservations r
       LEFT JOIN units u ON r.unit_id = u.id
       WHERE r.id = ?`,
      [resolvedParams.id]
    );

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Transform to expected format
    const res = reservation as Record<string, unknown>;
    const transformed = {
      ...res,
      unit: { id: res.unit_id, unit_name: res.unit_name, platform_account_id: res.platform_account_id },
    };

    return NextResponse.json(transformed);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/reservations/[id] - Update reservation (mark as manually edited)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const body = await request.json();

  try {
    await execute(
      `UPDATE reservations SET summary = ?, is_manually_edited = 1, manually_edited_at = NOW()
       WHERE id = ?`,
      [body.summary || null, resolvedParams.id]
    );

    const reservation = await queryOne(
      "SELECT * FROM reservations WHERE id = ?",
      [resolvedParams.id]
    );

    return NextResponse.json(reservation);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/reservations/[id] - Delete reservation (iCal)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !isAdmin(currentUser)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;

  try {
    await execute("DELETE FROM reservations WHERE id = ?", [resolvedParams.id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
