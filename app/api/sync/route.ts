import { NextResponse } from "next/server";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import ICAL from "ical.js";

interface ParsedEvent {
  start: string;
  end: string;
  summary: string | null;
  uid: string | null;
  status?: string | null;
  transparency?: string | null;
  description?: string | null;
}

interface UnitCalendar {
  id: string;
  unit_id: string;
  platform: string;
  platform_account_id?: string | null;
  ical_url: string;
  is_primary: boolean | number;
  unit_name: string;
  unit_status: string;
}

// Parse iCal URL
async function parseICalUrl(url: string): Promise<ParsedEvent[]> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "RentalsDashboard/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const icalText = await response.text();
    const jcalData = ICAL.parse(icalText);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents("vevent");

    const events: ParsedEvent[] = [];
    const pad = (n: number) => n.toString().padStart(2, "0");

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      if (event.startDate && event.endDate) {
        // CRITICAL FIX: Check if this is a DATE (not DATETIME)
        // DATE values should not be affected by timezone
        const isDateOnly = event.startDate.isDate;

        let startStr: string;
        let endStr: string;

        // ALWAYS use components to avoid timezone shifts during JS Date conversion
        const startInfo = event.startDate;
        const endInfo = event.endDate;

        startStr = `${startInfo.year}-${pad(startInfo.month)}-${pad(startInfo.day)}`;
        endStr = `${endInfo.year}-${pad(endInfo.month)}-${pad(endInfo.day)}`;

        const statusVal = vevent.getFirstPropertyValue("status");
        const transpVal = vevent.getFirstPropertyValue("transp");
        const descVal = vevent.getFirstPropertyValue("description");

        events.push({
          start: startStr,
          end: endStr,
          summary: event.summary || null,
          uid: event.uid || null,
          status: typeof statusVal === "string" ? statusVal : null,
          transparency: typeof transpVal === "string" ? transpVal : null,
          description: typeof descVal === "string" ? descVal : null,
        });
      }
    }

    return events;
  } catch (error: any) {
    console.error(`Error parsing iCal from ${url}:`, error.message);
    throw error;
  }
}

// POST - Sync calendars
export async function POST() {
  let unitsProcessed = 0;
  let errorsCount = 0;
  let newBookings = 0;
  const errors: string[] = [];

  try {
    // Get all calendars for active units
    const calendars = await query<UnitCalendar>(
      `SELECT uc.*, u.unit_name, u.status as unit_status
       FROM unit_calendars uc
       INNER JOIN units u ON uc.unit_id = u.id
       WHERE u.status = 'active'
       ORDER BY uc.is_primary DESC`
    );

    if (calendars.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد تقويمات للمزامنة",
        unitsProcessed: 0,
      });
    }

    const primaryReservations = new Map<string, Set<string>>();

    // Pass 1: Process primary calendars
    // SAFETY NOTE: We intentionally DO NOT delete reservations that are missing from the iCal feed.
    // This ensures that past bookings (history) are preserved forever in our database,
    // even if Airbnb/Gathern removes them from their recent iCal feed.
    for (const calendar of calendars) {
      const isPrimary = calendar.is_primary === 1 || calendar.is_primary === true;
      if (!isPrimary) continue;

      try {
        console.log(`[PRIMARY] Syncing: ${calendar.unit_name} (${calendar.platform})`);
        const events = await parseICalUrl(calendar.ical_url);

        const unitId = calendar.unit_id;
        if (!primaryReservations.has(unitId)) {
          primaryReservations.set(unitId, new Set());
        }
        const primarySet = primaryReservations.get(unitId)!;

        for (const event of events) {
          if (!event.start || !event.end) continue;
          if (event.start > event.end) continue;
          if (event.status && event.status.toUpperCase() === "CANCELLED") continue;

          const rangeKey = `${event.start}-${event.end}`;
          primarySet.add(rangeKey);

          // Filter blocked events
          if (calendar.platform === "airbnb" || calendar.platform === "gathern") {
            const summaryLower = (event.summary || "").toLowerCase();
            if (
              summaryLower.includes("not available") ||
              summaryLower.includes("unavailable") ||
              summaryLower.includes("blocked") ||
              summaryLower.includes("closed") ||
              summaryLower.includes("غير متاح") ||
              summaryLower.includes("مغلق") ||
              summaryLower.includes("محجوب")
            ) continue;

            if (calendar.platform === "airbnb") {
              const descLower = (event.description || "").toLowerCase();
              // Accept if: summary is "reserved", OR has URL in description, OR has meaningful summary (length > 2)
              const isReserved = summaryLower === "reserved" || summaryLower.includes("reserved");
              const hasUrl = descLower.includes("http");
              const hasMeaningfulSummary = (event.summary || "").trim().length > 2;
              if (!isReserved && !hasUrl && !hasMeaningfulSummary) continue;
            }
          }

          // Check if reservation exists and is manually edited
          const existing = await queryOne<{ id: string; is_manually_edited: number }>(
            `SELECT id, is_manually_edited FROM reservations
             WHERE unit_id = ? AND platform = ? AND start_date = ? AND end_date = ?`,
            [calendar.unit_id, calendar.platform, event.start, event.end]
          );

          if (existing?.is_manually_edited === 1) continue;

          // Upsert reservation with platform_account_id
          if (existing) {
            await execute(
              `UPDATE reservations SET summary = ?, raw_event = ?, platform_account_id = ?, last_synced_at = NOW()
               WHERE id = ?`,
              [event.summary, JSON.stringify(event), calendar.platform_account_id || null, existing.id]
            );
          } else {
            await execute(
              `INSERT INTO reservations (id, unit_id, platform, platform_account_id, start_date, end_date, summary, raw_event, last_synced_at, is_manually_edited)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
              [generateUUID(), calendar.unit_id, calendar.platform, calendar.platform_account_id || null, event.start, event.end, event.summary, JSON.stringify(event)]
            );
            newBookings++;
          }
        }

        await execute("UPDATE units SET last_synced_at = NOW() WHERE id = ?", [calendar.unit_id]);
        unitsProcessed++;

      } catch (error: any) {
        errorsCount++;
        errors.push(`${calendar.unit_name} [PRIMARY]: ${error.message}`);
      }
    }

    // Pass 2: Process non-primary calendars
    for (const calendar of calendars) {
      const isPrimary = calendar.is_primary === 1 || calendar.is_primary === true;
      if (isPrimary) continue;

      try {
        console.log(`[NON-PRIMARY] Syncing: ${calendar.unit_name} (${calendar.platform})`);
        const events = await parseICalUrl(calendar.ical_url);
        const primarySet = primaryReservations.get(calendar.unit_id);

        for (const event of events) {
          if (!event.start || !event.end) continue;
          if (event.start > event.end) continue;
          if (event.status?.toUpperCase() === "CANCELLED") continue;

          // Filter blocked events
          if (calendar.platform === "airbnb" || calendar.platform === "gathern") {
            const summaryLower = (event.summary || "").toLowerCase();
            if (
              summaryLower.includes("not available") ||
              summaryLower.includes("unavailable") ||
              summaryLower.includes("blocked") ||
              summaryLower.includes("closed") ||
              summaryLower.includes("غير متاح") ||
              summaryLower.includes("مغلق") ||
              summaryLower.includes("محجوب") ||
              summaryLower === "airbnb (not available)"
            ) continue;

            if (calendar.platform === "airbnb") {
              const descLower = (event.description || "").toLowerCase();
              // Accept if: summary is "reserved", OR has URL/reservation in description, OR has meaningful summary (length > 2)
              const isReserved = summaryLower === "reserved" || summaryLower.includes("reserved");
              const hasUrl = descLower.includes("http") || descLower.includes("reservation");
              const hasMeaningfulSummary = (event.summary || "").trim().length > 2;
              if (!isReserved && !hasUrl && !hasMeaningfulSummary) continue;
            }
          }

          // Skip if already in primary
          const eventRange = `${event.start}-${event.end}`;
          if ((calendar.platform === "airbnb" || calendar.platform === "gathern") && primarySet && primarySet.has(eventRange)) {
            continue;
          }

          // Check existing
          const existing = await queryOne<{ id: string; is_manually_edited: number }>(
            `SELECT id, is_manually_edited FROM reservations
             WHERE unit_id = ? AND platform = ? AND start_date = ? AND end_date = ?`,
            [calendar.unit_id, calendar.platform, event.start, event.end]
          );

          if (existing?.is_manually_edited === 1) continue;

          // Upsert
          if (existing) {
            await execute(
              `UPDATE reservations SET summary = ?, raw_event = ?, platform_account_id = ?, last_synced_at = NOW()
               WHERE id = ?`,
              [event.summary, JSON.stringify(event), calendar.platform_account_id || null, existing.id]
            );
          } else {
            await execute(
              `INSERT INTO reservations (id, unit_id, platform, platform_account_id, start_date, end_date, summary, raw_event, last_synced_at, is_manually_edited)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0)`,
              [generateUUID(), calendar.unit_id, calendar.platform, calendar.platform_account_id || null, event.start, event.end, event.summary, JSON.stringify(event)]
            );
            newBookings++;
          }
        }

        await execute("UPDATE units SET last_synced_at = NOW() WHERE id = ?", [calendar.unit_id]);
        unitsProcessed++;

      } catch (error: any) {
        errorsCount++;
        errors.push(`${calendar.unit_name}: ${error.message}`);
      }
    }

    const status = errorsCount === 0 ? "success" : errorsCount === calendars.length ? "failed" : "partial";
    const message = `تمت معالجة ${unitsProcessed} وحدة، ${newBookings} حجز`;

    // Log sync
    await execute(
      `INSERT INTO sync_logs (id, status, message, units_processed, errors_count, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateUUID(), status, message, unitsProcessed, errorsCount, errors.length > 0 ? JSON.stringify({ errors }) : null]
    );

    return NextResponse.json({
      success: true,
      status,
      message,
      unitsProcessed,
      newBookings,
      errorsCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Get last sync status
export async function GET() {
  const lastSync = await queryOne(
    "SELECT * FROM sync_logs ORDER BY run_at DESC LIMIT 1"
  );

  return NextResponse.json({ lastSync });
}