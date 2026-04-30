import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, generateUUID } from "@/lib/db";

interface UnitCalendar {
  id: string;
  unit_id: string;
  platform: string;
  ical_url: string;
  is_primary: boolean | number;
  platform_account_id: string | null;
  created_at: string;
  pa_id?: string;
  pa_account_name?: string;
  pa_platform?: string;
}

// GET unit calendars
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const calendars = await query<UnitCalendar>(
      `SELECT uc.*, 
              pa.id as pa_id, pa.account_name as pa_account_name, pa.platform as pa_platform
       FROM unit_calendars uc
       LEFT JOIN platform_accounts pa ON uc.platform_account_id = pa.id
       WHERE uc.unit_id = ?
       ORDER BY uc.created_at`,
      [id]
    );

    // Transform to expected format
    const transformed = calendars.map((cal) => ({
      ...cal,
      is_primary: cal.is_primary === 1 || cal.is_primary === true,
      platform_account: cal.pa_id
        ? { id: cal.pa_id, account_name: cal.pa_account_name, platform: cal.pa_platform }
        : null,
    }));

    return NextResponse.json(transformed);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// POST add calendar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await request.json();
  const { platform, ical_url, is_primary, platform_account_id } = body;

  if (!platform || !ical_url) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // If this calendar is marked as primary, unset other primary calendars for this unit
    if (is_primary) {
      await execute(
        "UPDATE unit_calendars SET is_primary = 0 WHERE unit_id = ?",
        [id]
      );
    }

    const calendarId = generateUUID();

    await execute(
      `INSERT INTO unit_calendars (id, unit_id, platform, ical_url, is_primary, platform_account_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [calendarId, id, platform, ical_url, is_primary ? 1 : 0, platform_account_id || null]
    );

    // If no primary calendar exists, make this one primary
    if (!is_primary) {
      const count = await queryOne<{ count: number }>(
        "SELECT COUNT(*) as count FROM unit_calendars WHERE unit_id = ? AND is_primary = 1",
        [id]
      );

      if (count?.count === 0) {
        await execute(
          "UPDATE unit_calendars SET is_primary = 1 WHERE id = ?",
          [calendarId]
        );
      }
    }

    const calendar = await queryOne(
      "SELECT * FROM unit_calendars WHERE id = ?",
      [calendarId]
    );

    return NextResponse.json(calendar, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE calendar
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const calendarId = searchParams.get("calendarId");

  if (!calendarId) {
    return NextResponse.json({ error: "Calendar ID required" }, { status: 400 });
  }

  try {
    await execute(
      "DELETE FROM unit_calendars WHERE id = ? AND unit_id = ?",
      [calendarId, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
