import { query } from "@/lib/db";
import Link from "next/link";
import { Plus, Download, Calendar } from "lucide-react";
import { PlatformExtended } from "@/lib/types/database";
import { BookingsView } from "./BookingsView";
import { BookingsPageClient } from "./BookingsPageClient";
import { BookingsFilter } from "./BookingsFilter";
import { checkUserPermission } from "@/lib/permissions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne } from "@/lib/db";

async function getFilters() {
  try {
    const [accounts, units] = await Promise.all([
      query<any>("SELECT id, account_name, platform FROM platform_accounts ORDER BY account_name"),
      query<any>("SELECT id, unit_name, unit_code FROM units ORDER BY unit_name"),
    ]);
    return { accounts: accounts || [], units: units || [] };
  } catch (error) {
    console.error("[Bookings] Error fetching filters:", error);
    return { accounts: [], units: [] };
  }
}

async function getBookings(searchParams?: {
  from?: string;
  to?: string;
  platform_account_id?: string | string[];
  unit_id?: string | string[];
  platform?: string | string[];
  booking_type?: string;
  status?: string;
  search?: string;
  today?: string;
  checkin_today?: string;
  checkout_today?: string;
}) {
  const filters = searchParams || {};

  try {
    // Build bookings query
    let bookingsSql = `
      SELECT b.*, u.id as unit_id_ref, u.unit_name, u.unit_code, pa.account_name
      FROM bookings b 
      LEFT JOIN units u ON b.unit_id = u.id 
      LEFT JOIN platform_accounts pa ON b.platform_account_id = pa.id
      WHERE 1=1
    `;
    const bookingsParams: any[] = [];

    // Platform accounts filter
    if (filters.platform_account_id) {
      const accountIds = Array.isArray(filters.platform_account_id) ? filters.platform_account_id : [filters.platform_account_id];
      if (accountIds.length > 0) {
        bookingsSql += ` AND b.platform_account_id IN (${accountIds.map(() => '?').join(',')})`;
        bookingsParams.push(...accountIds);
      }
    }

    // Units filter (now supports multiple)
    if (filters.unit_id) {
      const unitIds = Array.isArray(filters.unit_id) ? filters.unit_id : [filters.unit_id];
      if (unitIds.length > 0) {
        bookingsSql += ` AND b.unit_id IN (${unitIds.map(() => '?').join(',')})`;
        bookingsParams.push(...unitIds);
      }
    }

    // Platform filter (now supports multiple)
    if (filters.platform) {
      const platforms = Array.isArray(filters.platform) ? filters.platform : [filters.platform];
      const nonIcalPlatforms = platforms.filter(p => p !== "ical");
      if (nonIcalPlatforms.length > 0) {
        bookingsSql += ` AND b.platform IN (${nonIcalPlatforms.map(() => '?').join(',')})`;
        bookingsParams.push(...nonIcalPlatforms);
      }
    }

    // Search by guest name
    if (filters.search) {
      bookingsSql += " AND b.guest_name LIKE ?";
      bookingsParams.push(`%${filters.search}%`);
    }

    // Date filters
    if (filters.today) {
      bookingsSql += " AND b.checkin_date <= ? AND b.checkout_date >= ?";
      bookingsParams.push(filters.today, filters.today);
    } else if (filters.checkin_today) {
      bookingsSql += " AND b.checkin_date = ?";
      bookingsParams.push(filters.checkin_today);
    } else if (filters.checkout_today) {
      bookingsSql += " AND b.checkout_date = ?";
      bookingsParams.push(filters.checkout_today);
    } else {
      if (filters.from && filters.to) {
        bookingsSql += " AND b.checkin_date >= ? AND b.checkout_date <= ?";
        bookingsParams.push(filters.from, filters.to);
      } else if (filters.from) {
        bookingsSql += " AND b.checkin_date >= ?";
        bookingsParams.push(filters.from);
      } else if (filters.to) {
        bookingsSql += " AND b.checkout_date <= ?";
        bookingsParams.push(filters.to);
      }
    }

    bookingsSql += " ORDER BY b.checkin_date DESC";

    const bookingsData = await query<any>(bookingsSql, bookingsParams);

    // Build reservations query
    let resSql = `
      SELECT r.*, u.id as unit_id_ref, u.unit_name, u.unit_code, pa.account_name
      FROM reservations r 
      LEFT JOIN units u ON r.unit_id = u.id 
      LEFT JOIN platform_accounts pa ON r.platform_account_id = pa.id
      WHERE 1=1
    `;
    const resParams: any[] = [];

    // Unit filter for reservations
    if (filters.unit_id) {
      const unitIds = Array.isArray(filters.unit_id) ? filters.unit_id : [filters.unit_id];
      if (unitIds.length > 0) {
        resSql += ` AND r.unit_id IN (${unitIds.map(() => '?').join(',')})`;
        resParams.push(...unitIds);
      }
    }

    // Platform filter for reservations
    if (filters.platform) {
      const platforms = Array.isArray(filters.platform) ? filters.platform : [filters.platform];
      if (platforms.includes("ical")) {
        resSql += ` AND r.source IN (${platforms.filter(p => p === "ical" || p === "airbnb" || p === "gathern").map(() => '?').join(',')})`;
        resParams.push(...platforms.filter(p => p === "ical" || p === "airbnb" || p === "gathern"));
      }
    }

    // Search in reservations
    if (filters.search) {
      resSql += " AND r.summary LIKE ?";
      resParams.push(`%${filters.search}%`);
    }

    // Date filters for reservations
    if (filters.today) {
      resSql += " AND r.start_date <= ? AND r.end_date >= ?";
      resParams.push(filters.today, filters.today);
    } else if (filters.checkin_today) {
      resSql += " AND r.start_date = ?";
      resParams.push(filters.checkin_today);
    } else if (filters.checkout_today) {
      resSql += " AND r.end_date = ?";
      resParams.push(filters.checkout_today);
    } else {
      if (filters.from && filters.to) {
        resSql += " AND r.start_date >= ? AND r.end_date <= ?";
        resParams.push(filters.from, filters.to);
      } else if (filters.from) {
        resSql += " AND r.start_date >= ?";
        resParams.push(filters.from);
      } else if (filters.to) {
        resSql += " AND r.end_date <= ?";
        resParams.push(filters.to);
      }
    }
    resSql += " ORDER BY r.start_date DESC";

    const reservationsData = await query<any>(resSql, resParams);

    // Transform to unified format
    const bookings = bookingsData.map((b: any) => ({
      id: `booking-${b.id}`,
      type: "manual" as const,
      guest_name: b.guest_name,
      phone: b.phone,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
      amount: b.amount,
      currency: b.currency,
      platform: b.platform,
      platform_account_id: b.platform_account_id,
      platform_account: b.platform_account_id ? {
        id: b.platform_account_id,
        account_name: b.account_name,
        platform: b.platform || "manual"
      } : null,
      notes: b.notes,
      unit: b.unit_id_ref ? { id: b.unit_id_ref, unit_name: b.unit_name, unit_code: b.unit_code } : null,
    }));

    const reservations = reservationsData.map((r: any) => ({
      id: `reservation-${r.id}`,
      type: "ical" as const,
      guest_name: r.summary || "Reserved",
      phone: null,
      checkin_date: r.start_date,
      checkout_date: r.end_date,
      amount: null,
      currency: null,
      platform: r.platform || "ical",
      platform_account_id: r.platform_account_id,
      platform_account: r.platform_account_id ? {
        id: r.platform_account_id,
        account_name: r.account_name,
        platform: r.platform || "ical"
      } : null,
      notes: r.description,
      unit: r.unit_id_ref ? { id: r.unit_id_ref, unit_name: r.unit_name, unit_code: r.unit_code } : null,
    }));

    // Combine and filter
    let combined = [...bookings, ...reservations];

    // Apply booking type filter
    if (filters.booking_type && filters.booking_type !== "all") {
      combined = combined.filter(item => item.type === filters.booking_type);
    }

    // Apply status filter
    if (filters.status && filters.status !== "all") {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      combined = combined.filter(item => {
        const checkin = item.checkin_date;
        const checkout = item.checkout_date;

        if (filters.status === "upcoming") {
          return checkin > today;
        } else if (filters.status === "current") {
          return checkin <= today && checkout >= today;
        } else if (filters.status === "past") {
          return checkout < today;
        }
        return true;
      });
    }

    // Sort descending by checkin date
    combined.sort((a: any, b: any) => {
      const dateA = new Date(a.checkin_date).getTime();
      const dateB = new Date(b.checkin_date).getTime();
      return dateB - dateA;
    });

    return combined;
  } catch (error) {
    console.error("[Bookings] Error fetching bookings:", error);
    return [];
  }
}


function formatQuery(params: Record<string, string | string[] | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) {
      if (Array.isArray(v)) {
        v.forEach((val) => usp.append(k, val));
      } else {
        usp.set(k, v);
      }
    }
  });
  return usp.toString();
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from?: string;
    to?: string;
    platform_account_id?: string | string[];
    unit_id?: string | string[];
    platform?: string | string[];
    booking_type?: string;
    status?: string;
    search?: string;
    today?: string;
    checkin_today?: string;
    checkout_today?: string;
  }> | {
    from?: string;
    to?: string;
    platform_account_id?: string | string[];
    unit_id?: string | string[];
    platform?: string | string[];
    booking_type?: string;
    status?: string;
    search?: string;
    today?: string;
    checkin_today?: string;
    checkout_today?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  
  console.log("[BookingsPage] Rendering with params:", JSON.stringify(resolvedParams));

  // Check View Permission
  const canView = session?.user?.id
    ? await checkUserPermission(session.user.id, "/dashboard/bookings", "view")
    : false;

  // Check Edit Permission
  const canEdit = session?.user?.id
    ? await checkUserPermission(session.user.id, "/dashboard/bookings", "edit")
    : false;

  // Check if Super Admin
  const currentUser = session?.user?.id ? await queryOne<{ role: string }>("SELECT role FROM users WHERE id = ?", [session.user.id]) : null;
  const isSuperAdmin = currentUser?.role === "super_admin";

  const platformAccountIds = resolvedParams.platform_account_id
    ? (Array.isArray(resolvedParams.platform_account_id)
      ? resolvedParams.platform_account_id
      : [resolvedParams.platform_account_id])
    : [];

  const { accounts, units } = await getFilters();
  const bookings = await getBookings({ ...resolvedParams, platform_account_id: platformAccountIds.length > 0 ? platformAccountIds : undefined });

  // Count bookings by type
  const manualBookings = bookings.filter((b: any) => b.type === "manual").length;
  const icalBookings = bookings.filter((b: any) => b.type === "ical").length;
  const totalAmount = bookings.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

  const csvLink = `/api/bookings?${formatQuery({
    from: resolvedParams.from,
    to: resolvedParams.to,
    today: resolvedParams.today,
    checkin_today: resolvedParams.checkin_today,
    checkout_today: resolvedParams.checkout_today,
    platform_account_id: platformAccountIds.length > 0 ? platformAccountIds : undefined,
    unit_id: resolvedParams.unit_id,
    platform: resolvedParams.platform,
    export: "csv",
  })}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">الحجوزات</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إدارة الحجوزات مع فلترة بالتواريخ والحساب والوحدة والمنصة</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link
            href="/dashboard/bookings/calendar"
            className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4" />
            التقويم
          </Link>
          <Link
            href={csvLink}
            className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            تصدير Excel (CSV)
          </Link>
          {/* Only show 'Add Booking' if canEdit is true */}
          {canEdit && <BookingsPageClient />}
        </div>
      </div>

      {/* Advanced Filter */}
      <BookingsFilter units={units} accounts={accounts} />

      {/* Active Filters Pills */}
      {(resolvedParams.from || resolvedParams.to || resolvedParams.today || resolvedParams.checkin_today || resolvedParams.checkout_today) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {resolvedParams.checkin_today && (
            <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 font-medium border border-green-200">
              <span>دخول اليوم: {resolvedParams.checkin_today as string}</span>
              <Link href={`?${(() => {
                const p = new URLSearchParams(formatQuery(resolvedParams));
                p.delete('checkin_today');
                return p.toString();
              })()}`} className="hover:bg-green-200 rounded-full p-0.5">
                <Plus className="w-3 h-3 rotate-45" />
              </Link>
            </div>
          )}
          {resolvedParams.checkout_today && (
            <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 font-medium border border-orange-200">
              <span>خروج اليوم: {resolvedParams.checkout_today as string}</span>
              <Link href={`?${(() => {
                const p = new URLSearchParams(formatQuery(resolvedParams));
                p.delete('checkout_today');
                return p.toString();
              })()}`} className="hover:bg-orange-200 rounded-full p-0.5">
                <Plus className="w-3 h-3 rotate-45" />
              </Link>
            </div>
          )}
          {resolvedParams.today && (
            <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 font-medium border border-blue-200">
              <span>متواجد اليوم: {resolvedParams.today as string}</span>
              <Link href={`?${(() => {
                const p = new URLSearchParams(formatQuery(resolvedParams));
                p.delete('today');
                return p.toString();
              })()}`} className="hover:bg-blue-200 rounded-full p-0.5">
                <Plus className="w-3 h-3 rotate-45" />
              </Link>
            </div>
          )}
          {resolvedParams.from && resolvedParams.to && (
            <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs flex items-center gap-2 font-medium border border-gray-200">
              <span>الفترة: {resolvedParams.from as string} إلى {resolvedParams.to as string}</span>
              <Link href={`?${(() => {
                const p = new URLSearchParams(formatQuery(resolvedParams));
                p.delete('from');
                p.delete('to');
                return p.toString();
              })()}`} className="hover:bg-gray-200 rounded-full p-0.5">
                <Plus className="w-3 h-3 rotate-45" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">إجمالي الحجوزات</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{bookings.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">يدوية</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">{manualBookings}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-500">من iCal</p>
          <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{icalBookings}</p>
        </div>
        {/* Hide total amount for non-super-admins */}
        {isSuperAdmin && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-500">إجمالي المبالغ</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{totalAmount.toFixed(2)} SAR</p>
          </div>
        )}
      </div>

      {/* Bookings View (List/Grid/Table) */}
      {/* Pass showAmount prop to control visibility of amounts in the list */}
      <BookingsView bookings={bookings} canEdit={canEdit} showAmount={isSuperAdmin} />
    </div >
  );
}