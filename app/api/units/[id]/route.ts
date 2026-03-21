import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET single unit with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get unit
    const unit = await queryOne<any>(
      "SELECT * FROM units WHERE id = ?",
      [id]
    );

    if (!unit) {
      return NextResponse.json({ error: "الوحدة غير موجودة" }, { status: 404 });
    }

    // Get related data
    const unit_calendars = await query(
      "SELECT id, platform, ical_url, is_primary, platform_account_id FROM unit_calendars WHERE unit_id = ?",
      [id]
    );

    const reservations = await query(
      "SELECT * FROM reservations WHERE unit_id = ? ORDER BY start_date DESC",
      [id]
    );

    const bookings = await query(
      "SELECT * FROM bookings WHERE unit_id = ? ORDER BY checkin_date DESC",
      [id]
    );

    const maintenance_tickets = await query(
      "SELECT * FROM maintenance_tickets WHERE unit_id = ? ORDER BY created_at DESC",
      [id]
    );

    return NextResponse.json({
      ...unit,
      unit_calendars,
      reservations,
      bookings,
      maintenance_tickets,
    });
  } catch (error: any) {
    console.error("Get Unit Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST Create Unit
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, "/dashboard/units", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية إضافة وحدات" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { calendars, ...unitData } = body;
    const { unit_name, unit_code, city, address, capacity, status } = unitData;

    if (!unit_name) {
      return NextResponse.json({ error: "اسم الوحدة مطلوب" }, { status: 400 });
    }

    const unitId = generateUUID();

    // Create unit
    await execute(
      `INSERT INTO units (id, unit_name, unit_code, city, address, capacity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        unitId,
        unit_name,
        unit_code || null,
        city || null,
        address || null,
        capacity ? Number(capacity) : null,
        status || "active",
      ]
    );

    // Add calendars if provided
    if (calendars && Array.isArray(calendars) && calendars.length > 0) {
      for (const cal of calendars) {
        await execute(
          `INSERT INTO unit_calendars (id, unit_id, platform, ical_url, is_primary, platform_account_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            unitId,
            cal.platform,
            cal.ical_url,
            cal.is_primary ? 1 : 0,
            cal.platform_account_id || null,
          ]
        );
      }
    }

    // Get created unit
    const newUnit = await queryOne("SELECT * FROM units WHERE id = ?", [unitId]);

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "create",
      page_path: "/dashboard/units",
      resource_type: "unit",
      resource_id: unitId,
      description: `إضافة وحدة جديدة: ${unit_name}`,
      metadata: { unit_name, unit_id: unitId, calendars_count: calendars?.length || 0 },
    });

    return NextResponse.json(newUnit);
  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "حدث خطأ غير متوقع في السيرفر" }, { status: 500 });
  }
}

// PUT Update Unit
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, "/dashboard/units", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية تعديل الوحدات" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { unit_name, unit_code, city, address, capacity, status } = body;

    if (!unit_name) {
      return NextResponse.json({ error: "اسم الوحدة مطلوب" }, { status: 400 });
    }

    // Check if unit exists
    const unit = await queryOne("SELECT id FROM units WHERE id = ?", [id]);
    if (!unit) {
      return NextResponse.json({ error: "الوحدة غير موجودة" }, { status: 404 });
    }

    // Update unit
    await execute(
      `UPDATE units 
       SET unit_name = ?, 
           unit_code = ?, 
           city = ?, 
           address = ?, 
           capacity = ?, 
           status = ?
       WHERE id = ?`,
      [
        unit_name,
        unit_code || null,
        city || null,
        address || null,
        capacity ? Number(capacity) : null,
        status || "active",
        id,
      ]
    );

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "update",
      page_path: "/dashboard/units",
      resource_type: "unit",
      resource_id: id,
      description: `تعديل الوحدة: ${unit_name}`,
      metadata: { unit_name, unit_id: id },
    });

    return NextResponse.json({ success: true, message: "تم تحديث الوحدة بنجاح" });
  } catch (error: any) {
    console.error("Update Unit Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الوحدة" }, { status: 500 });
  }
}

// DELETE Unit
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, "/dashboard/units", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية حذف الوحدات" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Check if unit exists
    const unit = await queryOne<{ id: string; unit_name: string }>(
      "SELECT id, unit_name FROM units WHERE id = ?",
      [id]
    );

    if (!unit) {
      return NextResponse.json({ error: "الوحدة غير موجودة" }, { status: 404 });
    }

    // Delete related data (CASCADE should handle this, but being explicit)
    await execute("DELETE FROM unit_calendars WHERE unit_id = ?", [id]);
    await execute("DELETE FROM reservations WHERE unit_id = ?", [id]);
    await execute("DELETE FROM bookings WHERE unit_id = ?", [id]);
    await execute("DELETE FROM maintenance_tickets WHERE unit_id = ?", [id]);

    // Delete the unit
    await execute("DELETE FROM units WHERE id = ?", [id]);

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "delete",
      page_path: "/dashboard/units",
      resource_type: "unit",
      resource_id: id,
      description: `حذف الوحدة: ${unit.unit_name}`,
      metadata: { unit_name: unit.unit_name, unit_id: id },
    });

    return NextResponse.json({ success: true, message: "تم حذف الوحدة بنجاح" });
  } catch (error: any) {
    console.error("Delete Unit Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الوحدة" }, { status: 500 });
  }
}