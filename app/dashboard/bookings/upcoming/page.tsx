import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import Link from "next/link";
import { ArrowRight, CalendarDays, User, Phone, Home, Layers } from "lucide-react";
import { redirect } from "next/navigation";

async function getUpcomingBookings() {
  const today = new Date().toISOString().split("T")[0];

  // Calculate date 7 days from now
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split("T")[0];

  // Get bookings from bookings table (MySQL)
  const bookings = await query<any>(
    "SELECT b.*, u.unit_name, u.unit_code FROM bookings b LEFT JOIN units u ON b.unit_id = u.id WHERE b.checkin_date >= ? AND b.checkin_date <= ? ORDER BY b.checkin_date ASC",
    [today, nextWeekStr]
  );

  // Get reservations from iCal sync (MySQL)
  const reservations = await query<any>(
    "SELECT r.*, u.unit_name, u.unit_code FROM reservations r LEFT JOIN units u ON r.unit_id = u.id WHERE r.start_date >= ? AND r.start_date <= ? ORDER BY r.start_date ASC",
    [today, nextWeekStr]
  );

  // Combine and format
  const formattedBookings = bookings.map((b) => ({
    id: b.id,
    type: "manual",
    guest_name: b.guest_name || "غير محدد",
    phone: b.phone,
    checkin_date: b.checkin_date,
    checkout_date: b.checkout_date,
    amount: b.amount,
    currency: b.currency,
    platform: b.platform,
    unit: { id: b.unit_id, unit_name: b.unit_name, unit_code: b.unit_code },
    platform_account: null,
    notes: b.notes,
  }));

  const formattedReservations = reservations.map((r) => ({
    id: r.id,
    type: "ical",
    guest_name: r.summary || "حجز من iCal",
    phone: null,
    checkin_date: r.start_date,
    checkout_date: r.end_date,
    amount: null,
    currency: null,
    platform: r.platform,
    unit: { id: r.unit_id, unit_name: r.unit_name, unit_code: r.unit_code },
    platform_account: null,
    notes: r.summary,
  }));

  const allBookings = [...formattedBookings, ...formattedReservations].sort((a, b) =>
    new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
  );

  return allBookings;
}

export default async function UpcomingBookingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const bookings = await getUpcomingBookings();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الحجوزات القادمة (7 أيام)</h1>
          <p className="text-gray-600 mt-1">الحجوزات القادمة في الأسبوع القادم</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">لا توجد حجوزات قادمة في الأسبوع القادم</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking: any) => (
            <div
              key={`${booking.type}-${booking.id}`}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{booking.guest_name}</h3>
                    {booking.phone && (
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{booking.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  {booking.amount && (
                    <div className="text-lg font-bold text-green-600">
                      {booking.amount} {booking.currency || "SAR"}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {booking.type === "manual" ? (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">يدوي</span>
                    ) : (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">iCal</span>
                    )}
                    {booking.platform && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {booking.platform}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-medium">دخول:</span>{" "}
                    {(() => {
                      const [y, m, d] = booking.checkin_date.split("-");
                      const date = new Date(Number(y), Number(m) - 1, Number(d));
                      return date.toLocaleDateString("ar-EG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="font-medium">خروج:</span>{" "}
                    {(() => {
                      const [y, m, d] = booking.checkout_date.split("-");
                      const date = new Date(Number(y), Number(m) - 1, Number(d));
                      return date.toLocaleDateString("ar-EG", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });
                    })()}
                  </div>
                </div>
                {booking.unit && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Home className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium">الوحدة:</span> {booking.unit.unit_name}
                      {booking.unit.unit_code && (
                        <span className="text-gray-400"> ({booking.unit.unit_code})</span>
                      )}
                    </div>
                  </div>
                )}
                {booking.platform_account && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium">الحساب:</span> {booking.platform_account.account_name}
                    </div>
                  </div>
                )}
              </div>

              {booking.notes && (
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {booking.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
