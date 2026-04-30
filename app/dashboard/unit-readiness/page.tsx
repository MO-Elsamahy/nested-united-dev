import { query } from "@/lib/db";
import { UnitWithReadiness, UnitCalendar } from "@/lib/types/pms";
import { getCurrentUser } from "@/lib/auth";
import { Building2, User, Filter, LogOut, LogIn } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UpdateStatusButton } from "./UpdateStatusButton";
import { StatusFilterButtons } from "./StatusFilterButtons";

// Modern Status Configuration
// Using semantic colors for text/badges instead of heavy backgrounds
const STATUS_CONFIG = {
  checkout_today: {
    label: "خروج اليوم",
    color: "text-orange-600",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
    icon: "📤",
  },
  checkin_today: {
    label: "دخول اليوم",
    color: "text-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "📥",
  },
  guest_not_checked_out: {
    label: "الضيف لم يخرج",
    color: "text-red-600",
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: "⚠️",
  },
  awaiting_cleaning: {
    label: "في انتظار التنظيف",
    color: "text-amber-600",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: "⏳",
  },
  cleaning_in_progress: {
    label: "قيد التنظيف",
    color: "text-purple-600",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    icon: "🧹",
  },
  ready: {
    label: "جاهزة للتسكين",
    color: "text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "✅",
  },
  occupied: {
    label: "تم التسكين",
    color: "text-indigo-600",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: "🏠",
  },
  booked: {
    label: "إشغال",
    color: "text-sky-600",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    icon: "📅",
  },
};

async function getUnitsWithReadiness(statusFilter?: string | null) {
  try {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Fetch units and also check for arrivals/departures today in real-time
    const units = await query<UnitWithReadiness>(
      `SELECT u.*,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date = ? LIMIT 1) as manual_checkin_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.start_date = ? LIMIT 1) as ical_checkin_guest,
              (SELECT b.guest_name FROM bookings b WHERE b.unit_id = u.id AND b.checkout_date = ? LIMIT 1) as manual_checkout_guest,
              (SELECT r.summary FROM reservations r WHERE r.unit_id = u.id AND r.end_date = ? LIMIT 1) as ical_checkout_guest,
              (SELECT b.checkin_date FROM bookings b WHERE b.unit_id = u.id AND b.checkin_date = ? LIMIT 1) as manual_checkin_date,
              (SELECT r.start_date FROM reservations r WHERE r.unit_id = u.id AND r.start_date = ? LIMIT 1) as ical_checkin_date,
              (SELECT b.checkout_date FROM bookings b WHERE b.unit_id = u.id AND b.checkout_date = ? LIMIT 1) as manual_checkout_date,
              (SELECT r.end_date FROM reservations r WHERE r.unit_id = u.id AND r.end_date = ? LIMIT 1) as ical_checkout_date
       FROM units u 
       WHERE u.status = 'active' 
       ORDER BY u.unit_name`,
       [today, today, today, today, today, today, today, today]
    );

    if (!units || units.length === 0) return [];

    const unitIds = units.map((u) => u.id);
    const calendars = await query<UnitCalendar>(
      `SELECT id, unit_id, platform, is_primary FROM unit_calendars WHERE unit_id IN (${unitIds.map(() => '?').join(',')})`,
      unitIds
    );

    for (const unit of units) {
      unit.unit_calendars = calendars.filter((c) => c.unit_id === unit.id);
      
      // Compute dynamic Today flags
      unit._has_checkin_today = !!(unit.manual_checkin_date || unit.ical_checkin_date);
      unit._has_checkout_today = !!(unit.manual_checkout_date || unit.ical_checkout_date);
      
      // Logic: 
      // 1. If today is Checkout and unit hasn't been updated today (or is still 'Occupied') -> Show 'Checkout Today'
      // 2. If staff updates it TODAY to anything, respect the manual status 100%
      
      const updatedAt = unit.readiness_updated_at ? new Date(unit.readiness_updated_at) : null;
      const wasUpdatedToday = updatedAt && 
        updatedAt.toISOString().split('T')[0] === today;
      
      let computed = unit.readiness_status || "ready";

      // Only auto-override if it hasn't been handled today OR it's still in the default 'null' state
      if (!wasUpdatedToday || !unit.readiness_status) {
        if (unit._has_checkout_today && (computed === "occupied" || !unit.readiness_status)) {
          computed = "checkout_today";
        } else if (unit._has_checkin_today && (computed === "ready" || computed === "booked" || !unit.readiness_status)) {
          computed = "checkin_today";
        }
      }

      unit._computed_status = computed;
    }

    const grouped = new Map<string, { primary: UnitWithReadiness; units: UnitWithReadiness[] }>();

    for (const unit of units) {
      const key =
        (unit.readiness_group_id as string | null) ||
        (unit.unit_code as string | null) ||
        (unit.unit_name as string | null) ||
        (unit.id as string);

      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { primary: unit, units: [unit] });
      } else {
        existing.units.push(unit);
      }
    }

    let uniqueUnits = Array.from(grouped.values()).map(({ primary, units }) => ({
      ...primary,
      _merged_units: units,
    }));

    if (statusFilter && statusFilter !== "all") {
      uniqueUnits = uniqueUnits.filter((unit) => unit._computed_status === statusFilter);
    }

    return uniqueUnits;
  } catch (err) {
    console.error("[Unit Readiness] Unexpected error:", err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function UnitReadinessPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string };
}) {
  const resolvedParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const [currentUser, units] = await Promise.all([
    getCurrentUser(),
    getUnitsWithReadiness(resolvedParams.status),
  ]);

  const isSuperAdmin = currentUser?.role === "super_admin";

  const stats = {
    checkout_today: units.filter((u) => u._computed_status === "checkout_today").length,
    checkin_today: units.filter((u) => u._computed_status === "checkin_today").length,
    awaiting_cleaning: units.filter((u) => u._computed_status === "awaiting_cleaning").length,
    cleaning_in_progress: units.filter((u) => u._computed_status === "cleaning_in_progress").length,
    ready: units.filter((u) => u._computed_status === "ready").length,
    occupied: units.filter((u) => u._computed_status === "occupied").length,
    guest_not_checked_out: units.filter((u) => u._computed_status === "guest_not_checked_out").length,
    booked: units.filter((u) => u._computed_status === "booked").length,
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-gray-700" />
            جاهزية الوحدات
          </h1>
          <p className="text-gray-500 mt-1 text-sm">متابعة حالة النظافة وتسكين الوحدات</p>
        </div>
        {isSuperAdmin && (
          <Link
            href="/dashboard/unit-readiness/merge"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Filter className="w-4 h-4" />
            دمج الوحدات
          </Link>
        )}
      </div>

      {/* Clean Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div
            key={key}
            className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-2xl font-bold ${config.color}`}>
                {stats[key as keyof typeof stats]}
              </span>
              <span className="text-xl opacity-80 group-hover:scale-110 transition-transform">{config.icon}</span>
            </div>
            <span className="text-xs font-medium text-gray-500 truncate" title={config.label}>
              {config.label}
            </span>
          </div>
        ))}
      </div>

      {/* Filters & Grid */}
      <div className="space-y-6">
        <StatusFilterButtons currentStatus={resolvedParams.status} />

        {units.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">لا توجد وحدات</h3>
            <p className="text-gray-500 text-sm mt-1">لا توجد وحدات تطابق الفلتر المحدد حاليا</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {units.map((unit) => {

              
              const isCheckinToday = unit._has_checkin_today;
              const isCheckoutToday = unit._has_checkout_today;

              const status = unit._computed_status;
              const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
              const mergedUnits = unit._merged_units || [unit];

              const platforms = Array.from(
                new Set(
                  mergedUnits
                    .flatMap((u) => (u.unit_calendars || []).map((cal) => cal.platform))
                    .filter(Boolean)
                )
              );

              return (
                <div
                  key={unit.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1" title={unit.unit_name}>
                        {unit.unit_name}
                      </h3>
                      {unit.unit_code && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{unit.unit_code}</p>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap ${config.badge}`}>
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </div>
                      
                      {/* Special Today Indicators */}
                      <div className="flex gap-1">
                        {isCheckinToday && (
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" title="دخول اليوم">
                            <LogIn className="w-3 h-3" />
                            دخول
                          </span>
                        )}
                        {isCheckoutToday && (
                          <span className="bg-orange-600 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1" title="خروج اليوم">
                            <LogOut className="w-3 h-3" />
                            خروج
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-4">

                    {/* Guest Info */}
                    {unit.readiness_guest_name ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-gray-200 text-gray-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-0.5">الضيف</p>
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {unit.readiness_guest_name}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[62px] flex items-center justify-center text-xs text-gray-400 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                        -- لا يوجد ضيف --
                      </div>
                    )}

                    {/* Dates Grid */}
                    {(unit.readiness_checkin_date || unit.readiness_checkout_date) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">دخول</span>
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${unit.readiness_checkin_date ? 'text-gray-700' : 'text-gray-300'}`}>
                            <LogIn className="w-3.5 h-3.5" />
                            {unit.readiness_checkin_date ? new Date(unit.readiness_checkin_date).toLocaleDateString("en-GB") : '--'}
                          </div>
                        </div>
                        <div className="space-y-1 border-r border-gray-100 pr-3">
                          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">خروج</span>
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${unit.readiness_checkout_date ? 'text-gray-700' : 'text-gray-300'}`}>
                            <LogOut className="w-3.5 h-3.5" />
                            {unit.readiness_checkout_date ? new Date(unit.readiness_checkout_date).toLocaleDateString("en-GB") : '--'}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {unit.readiness_notes && (
                      <div className="text-xs text-gray-500 bg-amber-50/50 p-2.5 rounded border border-amber-100/50 leading-relaxed">
                        {unit.readiness_notes}
                      </div>
                    )}

                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                    <div className="flex gap-2 flex-wrap">
                      {platforms.length > 0 ? platforms.map((p) => (
                        <div key={p as string} className="
                           w-20 h-9 relative rounded-lg bg-white border border-gray-200 shadow-sm 
                           flex items-center justify-center 
                           hover:border-blue-300 hover:shadow-md transition-all
                         " title={p as string}>
                          <Image
                            src={`/images/platforms/${p}.svg`}
                            alt={p as string}
                            fill
                            className="object-contain px-2"
                          />
                        </div>
                      )) : (
                        <div className="h-9 px-3 rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center text-xs text-gray-400">
                          --
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full justify-end">
                      <Link
                        href={`/dashboard/units/${unit.id}?from=readiness`}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
                      >
                        التفاصيل
                      </Link>
                      <UpdateStatusButton
                        unit={unit}
                        currentStatus={status || ""}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
