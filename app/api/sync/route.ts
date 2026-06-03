import { NextResponse } from "next/server";

import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import ICAL from "ical.js";
import { clearAnalyticsCache } from "@/lib/analytics-cache";

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
        const _isDateOnly = event.startDate.isDate;

        // ALWAYS use components to avoid timezone shifts during JS Date conversion
        const startInfo = event.startDate;
        const endInfo = event.endDate;

        const startStr = `${startInfo.year}-${pad(startInfo.month)}-${pad(startInfo.day)}`;
        const endStr = `${endInfo.year}-${pad(endInfo.month)}-${pad(endInfo.day)}`;

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error(`Error parsing iCal from ${url}:`, errorMessage);
    throw error;
  }
}

// POST - Sync calendars
export async function POST() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  let unitsProcessed = 0;
  let errorsCount = 0;
  let newBookings = 0;
  const errors: string[] = [];

  try {
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

    for (const calendar of calendars) {
      try {


        const events = await parseICalUrl(calendar.ical_url);
        const unitId = calendar.unit_id;
        const isPrimary = calendar.is_primary === 1 || calendar.is_primary === true;

        if (isPrimary && !primaryReservations.has(unitId)) {
          primaryReservations.set(unitId, new Set());
        }
        const primarySet = isPrimary ? primaryReservations.get(unitId)! : primaryReservations.get(unitId);

        const seenIds: string[] = [];

        for (const event of events) {
          if (!event.start || !event.end) continue;
          if (event.start > event.end) continue;
          if (event.status?.toUpperCase() === "CANCELLED") continue;

          const rangeKey = `${event.start}-${event.end}`;
          if (isPrimary && primarySet) primarySet.add(rangeKey);

          // Filtering logic (Airbnb/Gathern specific)
          const summaryLower = (event.summary || "").toLowerCase();
          if (calendar.platform === "airbnb" || calendar.platform === "gathern") {
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
              const isReserved = summaryLower === "reserved" || summaryLower.includes("reserved");
              const hasUrl = descLower.includes("http") || descLower.includes("reservation");
              const hasMeaningfulSummary = (event.summary || "").trim().length > 2;
              if (!isReserved && !hasUrl && !hasMeaningfulSummary) continue;
            }
          }

          // Skip if already in primary (for non-primary calendars)
          if (!isPrimary && primarySet && primarySet.has(rangeKey)) continue;

          // NEW: Skip if already exists as a manual booking (by ical_uid or by date fallback)
          let existsAsBooking = false;
          if (event.uid) {
            const byUid = await queryOne(
              "SELECT id FROM bookings WHERE ical_uid = ?",
              [event.uid]
            );
            if (byUid) existsAsBooking = true;
          }
          if (!existsAsBooking) {
            const asBooking = await queryOne(
              "SELECT id FROM bookings WHERE unit_id = ? AND checkin_date = ? AND checkout_date = ?",
              [calendar.unit_id, event.start, event.end]
            );
            if (asBooking) existsAsBooking = true;
          }
          if (existsAsBooking) continue;

          // Check if reservation exists
          const existing = await queryOne<{ id: string; is_manually_edited: number }>(
            `SELECT id, is_manually_edited FROM reservations
             WHERE unit_id = ? AND platform = ? AND start_date = ? AND end_date = ?`,
            [calendar.unit_id, calendar.platform, event.start, event.end]
          );

          if (existing?.is_manually_edited === 1) {
            seenIds.push(existing.id);
            continue;
          }

          if (existing) {
            await execute(
              `UPDATE reservations SET summary = ?, raw_event = ?, platform_account_id = ?, last_synced_at = NOW(), ical_uid = ?
               WHERE id = ?`,
              [event.summary, JSON.stringify(event), calendar.platform_account_id || null, event.uid || null, existing.id]
            );
            seenIds.push(existing.id);
          } else {
            const newId = generateUUID();
            await execute(
              `INSERT IGNORE INTO reservations (id, unit_id, platform, platform_account_id, start_date, end_date, summary, raw_event, last_synced_at, is_manually_edited, ical_uid)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 0, ?)`,
              [newId, calendar.unit_id, calendar.platform, calendar.platform_account_id || null, event.start, event.end, event.summary, JSON.stringify(event), event.uid || null]
            );
            seenIds.push(newId);
            newBookings++;
          }
        }

        // CLEANUP: Delete future reservations for this unit+platform that are no longer in the feed
        // This ensures cancelled Airbnb/Gathern bookings are removed.
        if (seenIds.length > 0) {
          const placeholders = seenIds.map(() => "?").join(",");
          await execute(
            `DELETE FROM reservations 
             WHERE unit_id = ? AND platform = ? 
             AND start_date >= CURDATE() 
             AND is_manually_edited = 0
             AND id NOT IN (${placeholders})`,
            [calendar.unit_id, calendar.platform, ...seenIds]
          );
        } else {
          // If no events in feed, delete all future reservations for this feed
          await execute(
            `DELETE FROM reservations 
             WHERE unit_id = ? AND platform = ? 
             AND start_date >= CURDATE() 
             AND is_manually_edited = 0`,
            [calendar.unit_id, calendar.platform]
          );
        }

        await execute("UPDATE units SET last_synced_at = NOW() WHERE id = ?", [calendar.unit_id]);
        unitsProcessed++;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        errorsCount++;
        errors.push(`${calendar.unit_name} (${calendar.platform}): ${errorMessage}`);
      }
    }

    const status = errorsCount === 0 ? "success" : errorsCount === calendars.length ? "failed" : "partial";
    const message = `تمت معالجة ${unitsProcessed} وحدة، ${newBookings} حجز`;

    await execute(
      `INSERT INTO sync_logs (id, status, message, units_processed, errors_count, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generateUUID(), status, message, unitsProcessed, errorsCount, errors.length > 0 ? JSON.stringify({ errors }) : null]
    );

    clearAnalyticsCache();

    return NextResponse.json({
      success: true,
      status,
      message,
      unitsProcessed,
      newBookings,
      errorsCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// GET - Get last sync status
export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const lastSync = await queryOne(
    "SELECT * FROM sync_logs ORDER BY run_at DESC LIMIT 1"
  );

  return NextResponse.json({ lastSync });
}