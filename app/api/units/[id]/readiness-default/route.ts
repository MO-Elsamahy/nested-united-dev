import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { queryOne } from "@/lib/db";

// GET /api/units/[id]/readiness-default - Suggest checkin/checkout dates & guest name from bookings/iCal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    // Allow admins + maintenance workers
    if (
      !currentUser ||
      !(isAdmin(currentUser) || currentUser.role === "maintenance_worker")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Local today based on server/local system time (e.g. Saudi/Egypt)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    let checkin_date: string | null = null;
    let checkout_date: string | null = null;
    let guest_name: string | null = null;

    // 1) Try to find a stay that covers today
    const currentBooking = await queryOne<{
      guest_name: string;
      checkin_date: string;
      checkout_date: string;
    }>(
      `SELECT guest_name, checkin_date, checkout_date FROM bookings
       WHERE unit_id = ? AND checkin_date <= ? AND checkout_date >= ?
       ORDER BY checkin_date DESC LIMIT 1`,
      [id, today, today]
    );

    const currentReservation = await queryOne<{
      summary: string;
      start_date: string;
      end_date: string;
    }>(
      `SELECT summary, start_date, end_date FROM reservations
       WHERE unit_id = ? AND start_date <= ? AND end_date >= ?
       ORDER BY start_date DESC LIMIT 1`,
      [id, today, today]
    );

    if (currentBooking) {
      checkin_date = currentBooking.checkin_date;
      checkout_date = currentBooking.checkout_date;
      guest_name = currentBooking.guest_name;
    } else if (currentReservation) {
      checkin_date = currentReservation.start_date;
      checkout_date = currentReservation.end_date;
      guest_name = currentReservation.summary || "حجز من iCal";
    } else {
      // 2) Look for nearest future stay
      const futureBooking = await queryOne<{
        guest_name: string;
        checkin_date: string;
        checkout_date: string;
      }>(
        `SELECT guest_name, checkin_date, checkout_date FROM bookings
         WHERE unit_id = ? AND checkin_date > ?
         ORDER BY checkin_date ASC LIMIT 1`,
        [id, today]
      );

      const futureReservation = await queryOne<{
        summary: string;
        start_date: string;
        end_date: string;
      }>(
        `SELECT summary, start_date, end_date FROM reservations
         WHERE unit_id = ? AND start_date > ?
         ORDER BY start_date ASC LIMIT 1`,
        [id, today]
      );

      if (futureBooking && futureReservation) {
        if (futureBooking.checkin_date <= futureReservation.start_date) {
          checkin_date = futureBooking.checkin_date;
          checkout_date = futureBooking.checkout_date;
          guest_name = futureBooking.guest_name;
        } else {
          checkin_date = futureReservation.start_date;
          checkout_date = futureReservation.end_date;
          guest_name = futureReservation.summary || "حجز من iCal";
        }
      } else if (futureBooking) {
        checkin_date = futureBooking.checkin_date;
        checkout_date = futureBooking.checkout_date;
        guest_name = futureBooking.guest_name;
      } else if (futureReservation) {
        checkin_date = futureReservation.start_date;
        checkout_date = futureReservation.end_date;
        guest_name = futureReservation.summary || "حجز من iCal";
      }
    }

    return NextResponse.json({
      checkin_date,
      checkout_date,
      guest_name,
    });
  } catch (error: any) {
    console.error("Error in GET /api/units/[id]/readiness-default:", error);
    return NextResponse.json(
      { error: error?.message || "Unexpected error fetching default readiness dates" },
      { status: 500 }
    );
  }
}
