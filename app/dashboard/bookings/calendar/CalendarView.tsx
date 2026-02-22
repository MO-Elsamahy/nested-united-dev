"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, Edit, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  type: "manual" | "ical";
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  unit?: {
    id?: string;
    unit_name: string;
    unit_code?: string | null;
  } | null;
  platform_account?: {
    account_name: string;
  } | null;
}

interface CalendarViewProps {
  year: number;
  month: number;
  initialBookings: Booking[];
}

export function CalendarView({ year: initialYear, month: initialMonth, initialBookings }: CalendarViewProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date(initialYear, initialMonth, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

  // Debug: Log initial bookings
  console.log('🔍 CalendarView initialized with', initialBookings.length, 'bookings');
  console.log('📅 Year:', initialYear, 'Month:', initialMonth);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Convert iCal reservation to editable booking
  const handleConvertToBooking = async (reservationId: string) => {
    setConverting(reservationId);
    try {
      const res = await fetch('/api/bookings/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId })
      });

      const data = await res.json();

      if (data.success && data.booking_id) {
        // Redirect to edit page
        router.push(`/dashboard/bookings/${data.booking_id}`);
      } else {
        alert('فشل تحويل الحجز');
      }
    } catch (error) {
      console.error('Error converting:', error);
      alert('حدث خطأ');
    } finally {
      setConverting(null);
    }
  };

  // Sync bookings state when initialBookings change
  useEffect(() => {
    console.log('📦 Updating bookings state with', initialBookings.length, 'items');
    setBookings(initialBookings);
  }, [initialBookings]);

  // Fetch bookings when month/year changes
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/bookings?year=${year}&month=${month + 1}`);
        const data = await res.json();
        console.log('🌐 Fetched', data.length, 'bookings from API');
        setBookings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if month/year changed from initial
    if (year !== initialYear || month !== initialMonth) {
      fetchBookings();
    }
  }, [year, month, initialYear, initialMonth]);

  const monthNames = [
    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
  ];

  const weekDays = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const adjustedStartingDay = (startingDayOfWeek + 1) % 7;

  function getBookingsForDate(date: number): Booking[] {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

    const filtered = bookings.filter((b) => {
      const isMatch = b.checkin_date <= dateStr && b.checkout_date >= dateStr;
      return isMatch;
    });

    // Debug for day 27 (should have bookings)
    if (date === 27) {
      console.log(`📅 Day 27 (${dateStr}): Found ${filtered.length} bookings out of ${bookings.length} total`);
      if (bookings.length > 0 && filtered.length === 0) {
        console.log('Sample booking:', bookings[0]);
      }
    }

    return filtered;
  }

  function goToPreviousMonth() {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
    router.push(`/dashboard/bookings/calendar?year=${newDate.getFullYear()}&month=${newDate.getMonth() + 1}`);
  }

  function goToNextMonth() {
    const newDate = new Date(year, month + 1, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
    router.push(`/dashboard/bookings/calendar?year=${newDate.getFullYear()}&month=${newDate.getMonth() + 1}`);
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(null);
    router.push(`/dashboard/bookings/calendar?year=${today.getFullYear()}&month=${today.getMonth() + 1}`);
  }

  const selectedDateBookings = selectedDate
    ? getBookingsForDate(parseInt(selectedDate))
    : [];

  return (
    <>
      {/* Calendar Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={goToNextMonth}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          اليوم
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {/* Empty cells before month starts */}
          {Array.from({ length: adjustedStartingDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[100px] border border-gray-100 bg-gray-50" />
          ))}

          {/* Days of the month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayBookings = getBookingsForDate(day);
            const isToday = dateStr === new Date().toISOString().split("T")[0];
            const isSelected = selectedDate === String(day);

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(selectedDate === String(day) ? null : String(day))}
                className={`min-h-[100px] border border-gray-200 p-2 cursor-pointer transition-colors ${isToday ? "bg-blue-50 border-blue-300" : ""
                  } ${isSelected ? "bg-blue-100 border-blue-500" : "hover:bg-gray-50"}`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600" : "text-gray-700"
                    }`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map((booking) => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 rounded truncate ${booking.type === "manual"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                        }`}
                      title={booking.guest_name}
                    >
                      {booking.guest_name}
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayBookings.length - 3} أكثر
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Bookings Details */}
      {selectedDate && selectedDateBookings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>الحجوزات في {parseInt(selectedDate)} {monthNames[month]} {year}</span>
            <span className="text-sm font-normal text-gray-500">({selectedDateBookings.length} حجز)</span>
          </h3>
          <div className="space-y-3">
            {selectedDateBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{booking.guest_name}</h4>
                    {booking.unit && (
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.unit.unit_name}
                        {booking.unit.unit_code && (
                          <span className="text-gray-400"> ({booking.unit.unit_code})</span>
                        )}
                      </p>
                    )}
                    {booking.platform_account && (
                      <p className="text-xs text-gray-500 mt-1">
                        الحساب: {booking.platform_account.account_name}
                      </p>
                    )}
                    <div className="text-sm text-gray-600 mt-2">
                      {(() => {
                        const [sy, sm, sd] = booking.checkin_date.split("-");
                        const [ey, em, ed] = booking.checkout_date.split("-");
                        const start = new Date(Number(sy), Number(sm) - 1, Number(sd));
                        const end = new Date(Number(ey), Number(em) - 1, Number(ed));
                        return `${start.toLocaleDateString("ar-EG")} → ${end.toLocaleDateString("ar-EG")}`;
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${booking.type === "manual"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                        }`}
                    >
                      {booking.type === "manual" ? "يدوي" : "iCal"}
                    </span>
                    {booking.type === "manual" && (
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition"
                      >
                        <Edit className="w-3 h-3" />
                        تعديل
                      </Link>
                    )}
                    {booking.type === "ical" && (
                      <button
                        onClick={() => handleConvertToBooking(booking.id)}
                        disabled={converting === booking.id}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xs rounded-lg transition"
                      >
                        <Edit className="w-3 h-3" />
                        {converting === booking.id ? "جاري التحويل..." : "تعديل"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedDate && selectedDateBookings.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">لا توجد حجوزات في هذا اليوم</p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">دليل الألوان:</h3>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span className="text-gray-600">حجوزات يدوية</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span className="text-gray-600">حجوزات من iCal</span>
          </div>
        </div>
      </div>
    </>
  );
}
