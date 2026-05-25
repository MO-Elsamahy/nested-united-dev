import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/units/readiness - Get all units with their readiness status
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const units = await query(
      `SELECT u.*, 
              pa.id as pa_id, pa.platform as pa_platform, pa.account_name as pa_account_name,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_guest,
              (SELECT b.checkin_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_checkin,
              (SELECT r.start_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_checkin,
              (SELECT b.checkout_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_checkout,
              (SELECT r.end_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date <= ? AND r.end_date >= ? ORDER BY r.start_date DESC LIMIT 1) as active_ical_checkout,
              (SELECT b.notes FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date <= ? AND b.checkout_date >= ? ORDER BY b.checkin_date DESC LIMIT 1) as active_manual_notes
       FROM units u
       LEFT JOIN platform_accounts pa ON u.platform_account_id = pa.id
       WHERE u.status = 'active'
       ORDER BY u.unit_name`,
       [
         today, today, // active_manual_guest
         today, today, // active_ical_guest
         today, today, // active_manual_checkin
         today, today, // active_ical_checkin
         today, today, // active_manual_checkout
         today, today, // active_ical_checkout
         today, today  // active_manual_notes
       ]
    );

    // Transform to match expected format
    let filteredUnits = (units as Record<string, any>[]).map((u) => {
      const activeGuestName = u.active_manual_guest || u.active_ical_guest;
      const activeCheckin = u.active_manual_checkin || u.active_ical_checkin;
      const activeCheckout = u.active_manual_checkout || u.active_ical_checkout;
      const activeNotes = u.active_manual_notes || (u.active_ical_guest ? `iCal: ${u.active_ical_guest}` : null);

      return {
        ...u,
        platform_account: u.pa_id
          ? { id: u.pa_id, platform: u.pa_platform, account_name: u.pa_account_name }
          : null,
        readiness: {
          status: u.readiness_status,
          checkout_date: activeCheckout || u.readiness_checkout_date,
          checkin_date: activeCheckin || u.readiness_checkin_date,
          guest_name: activeGuestName || u.readiness_guest_name,
          notes: activeNotes || u.readiness_notes,
        },
      };
    });

    // Filter by status if provided
    if (statusFilter) {
      filteredUnits = filteredUnits.filter(
        (unit) => unit.readiness?.status === statusFilter
      );
    }

    return NextResponse.json(filteredUnits);
  } catch (error: unknown) {
    console.error("Error in GET /api/units/readiness:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
