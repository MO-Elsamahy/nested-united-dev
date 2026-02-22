import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

interface UnitCalendar {
  id: string;
  platform: string;
  ical_url: string;
  is_primary: boolean | number;
  platform_account_id: string | null;
}

interface PlatformAccount {
  id: string;
  account_name: string;
  platform: string;
}

// GET all units
export async function GET() {
  try {
    // Get all units
    const units = await query(
      "SELECT * FROM units ORDER BY created_at DESC"
    );

    // Get calendars for each unit
    for (const unit of units as any[]) {
      const calendars = await query<UnitCalendar>(
        `SELECT uc.id, uc.platform, uc.ical_url, uc.is_primary, uc.platform_account_id
         FROM unit_calendars uc
         WHERE uc.unit_id = ?`,
        [unit.id]
      );

      // Get platform accounts for calendars
      for (const cal of calendars) {
        if (cal.platform_account_id) {
          const account = await queryOne<PlatformAccount>(
            "SELECT id, account_name, platform FROM platform_accounts WHERE id = ?",
            [cal.platform_account_id]
          );
          (cal as any).platform_account = account;
        } else {
          (cal as any).platform_account = null;
        }
        // Convert MySQL boolean
        cal.is_primary = cal.is_primary === 1 || cal.is_primary === true;
      }

      unit.unit_calendars = calendars;
    }

    return NextResponse.json(units);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new unit
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, "/dashboard/units", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الإنشاء" }, { status: 403 });
  }

  const body = await request.json();
  const { unit_name, unit_code, city, address, capacity, status, calendars } = body;

  if (!unit_name) {
    return NextResponse.json({ error: "اسم الوحدة مطلوب" }, { status: 400 });
  }

  const unitId = generateUUID();

  try {
    // Create unit
    await execute(
      `INSERT INTO units (id, unit_name, unit_code, city, address, capacity, status, platform_account_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [unitId, unit_name, unit_code || null, city || null, address || null, capacity || null, status || "active", null]
    );

    // Create calendars if provided
    if (calendars && Array.isArray(calendars) && calendars.length > 0) {
      for (let i = 0; i < calendars.length; i++) {
        const cal = calendars[i];
        await execute(
          `INSERT INTO unit_calendars (id, unit_id, platform, ical_url, is_primary, platform_account_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            unitId,
            cal.platform,
            cal.ical_url || "",
            cal.is_primary || (i === 0) ? 1 : 0,
            cal.platform_account_id || null,
          ]
        );
      }
    }

    // Get the created unit
    const unit = await queryOne("SELECT * FROM units WHERE id = ?", [unitId]);

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "create",
      page_path: "/dashboard/units",
      resource_type: "unit",
      resource_id: unitId,
      description: `إنشاء وحدة جديدة: ${unit_name}`,
      metadata: { unit_name, calendars_count: calendars?.length || 0 },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error: any) {
    // Rollback on error
    await execute("DELETE FROM units WHERE id = ?", [unitId]).catch(() => { });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
