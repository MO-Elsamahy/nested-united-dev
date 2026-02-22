import { query } from "@/lib/db";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CalendarView } from "./CalendarView";

async function getBookingsForMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
  const lastDay = new Date(year, month + 1, 0).toISOString().split("T")[0];

  try {
    // Get bookings from bookings table
    const bookings = await query<any>(
      `SELECT b.*, u.id as unit_id_ref, u.unit_name, u.unit_code 
       FROM bookings b 
       LEFT JOIN units u ON b.unit_id = u.id 
       WHERE b.checkin_date <= ? AND b.checkout_date >= ? 
       ORDER BY b.checkin_date ASC`,
      [lastDay, firstDay]
    );

    // Get reservations from iCal sync
    const reservations = await query<any>(
      `SELECT r.*, u.id as unit_id_ref, u.unit_name, u.unit_code 
       FROM reservations r 
       LEFT JOIN units u ON r.unit_id = u.id 
       WHERE r.start_date <= ? AND r.end_date >= ? 
       ORDER BY r.start_date ASC`,
      [lastDay, firstDay]
    );

    // Combine and format
    const allBookings = [
      ...(bookings || []).map((b: any) => ({
        id: b.id,
        type: "manual" as const,
        guest_name: b.guest_name || "غير محدد",
        checkin_date: typeof b.checkin_date === 'string' ? b.checkin_date : new Date(b.checkin_date).toISOString().split('T')[0],
        checkout_date: typeof b.checkout_date === 'string' ? b.checkout_date : new Date(b.checkout_date).toISOString().split('T')[0],
        unit: { id: b.unit_id_ref, unit_name: b.unit_name, unit_code: b.unit_code },
        platform_account: null,
      })),
      ...(reservations || []).map((r: any) => ({
        id: r.id,
        type: "ical" as const,
        guest_name: r.summary || "حجز من iCal",
        checkin_date: typeof r.start_date === 'string' ? r.start_date : new Date(r.start_date).toISOString().split('T')[0],
        checkout_date: typeof r.end_date === 'string' ? r.end_date : new Date(r.end_date).toISOString().split('T')[0],
        unit: { id: r.unit_id_ref, unit_name: r.unit_name, unit_code: r.unit_code },
        platform_account: null,
      })),
    ];

    return allBookings;
  } catch (error) {
    console.error("[CalendarPage] Error fetching bookings:", error);
    return [];
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ year?: string; month?: string }> | { year?: string; month?: string };
}) {
  const resolvedParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const today = new Date();
  const year = resolvedParams.year ? parseInt(resolvedParams.year) : today.getFullYear();
  const month = resolvedParams.month ? parseInt(resolvedParams.month) - 1 : today.getMonth();

  const bookings = await getBookingsForMonth(year, month);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">تقويم الحجوزات</h1>
          <p className="text-gray-600 mt-1">عرض جميع الحجوزات في شكل تقويم شهري</p>
        </div>
      </div>

      <CalendarView year={year} month={month} initialBookings={bookings} />
    </div>
  );
}
