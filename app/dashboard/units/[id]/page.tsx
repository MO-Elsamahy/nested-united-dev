import { query, queryOne } from "@/lib/db";
import { ArrowRight, MapPin, Users, Calendar, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UpdateStatusButton } from "../../unit-readiness/UpdateStatusButton";
import { hasPermission } from "@/lib/server-permissions";
import { UnitEditButton } from "./UnitEditButton";

// Status configurations
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  checkout_today: { label: "خروج اليوم", color: "bg-orange-100 text-orange-800", icon: "📤" },
  checkin_today: { label: "دخول اليوم", color: "bg-blue-100 text-blue-800", icon: "📥" },
  guest_not_checked_out: { label: "الضيف لم يخرج", color: "bg-red-100 text-red-800", icon: "⚠️" },
  awaiting_cleaning: { label: "في انتظار التنظيف", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
  cleaning_in_progress: { label: "قيد التنظيف", color: "bg-purple-100 text-purple-800", icon: "🧹" },
  ready: { label: "جاهزة للتسكين", color: "bg-green-100 text-green-800", icon: "✅" },
  occupied: { label: "تم التسكين", color: "bg-gray-100 text-gray-800", icon: "🏠" },
};

async function getUnit(id: string) {
  try {
    // Get unit
    const unit = await queryOne<any>(
      "SELECT * FROM units WHERE id = ?",
      [id]
    );

    if (!unit) {
      return null;
    }

    // Get related data
    const unit_calendars = await query(
      "SELECT id, platform, ical_url, is_primary, platform_account_id FROM unit_calendars WHERE unit_id = ?",
      [id]
    );

    const reservations = await query(
      "SELECT * FROM reservations WHERE unit_id = ? ORDER BY start_date DESC",
      [id]
    );

    const bookings = await query(
      "SELECT * FROM bookings WHERE unit_id = ? ORDER BY checkin_date DESC",
      [id]
    );

    const maintenance_tickets = await query(
      "SELECT * FROM maintenance_tickets WHERE unit_id = ? ORDER BY created_at DESC",
      [id]
    );

    return {
      ...unit,
      unit_calendars,
      reservations,
      bookings,
      maintenance_tickets,
    };
  } catch (error) {
    console.error("[UnitDetails] MySQL error:", error);
    return null;
  }
}

export default async function UnitDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const canEdit = await hasPermission("/dashboard/units", "edit");

  let unit = null;
  try {
    unit = await getUnit(id);
  } catch (error) {
    console.error("[UnitDetails] Error loading unit:", error);
  }

  if (!unit) {
    return (
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">تعذّر تحميل تفاصيل الوحدة</h1>
        <p className="text-gray-700 mb-4">
          لم نتمكن من الوصول إلى بيانات هذه الوحدة. تأكد أن لديك صلاحية الوصول وأن الوحدة موجودة فعلياً.
        </p>
        <Link
          href="/dashboard/units"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          الرجوع للوحدات
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];

  // Combine reservations (iCal) and bookings (manual)
  const allUpcoming = [
    ...(unit.reservations || [])
      .filter((r: any) => r.start_date >= today)
      .map((r: any) => ({
        id: r.id,
        type: "ical",
        start_date: r.start_date,
        end_date: r.end_date,
        summary: r.summary,
        platform: r.platform,
        guest_name: r.summary || "حجز من iCal",
      })),
    ...(unit.bookings || [])
      .filter((b: any) => b.checkin_date >= today)
      .map((b: any) => ({
        id: b.id,
        type: "manual",
        start_date: b.checkin_date,
        end_date: b.checkout_date,
        summary: b.notes,
        platform: b.platform,
        guest_name: b.guest_name,
        amount: b.amount,
        currency: b.currency,
        phone: b.phone,
        platform_account: b.platform_account,
      })),
  ]
    .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 10);

  const openTickets = unit.maintenance_tickets?.filter(
    (t: any) => t.status !== "resolved"
  );

  // Check if unit has upcoming booking and is not ready
  const hasUpcomingBooking = allUpcoming.length > 0;
  const readinessStatus = unit.readiness_status || "ready";
  const isReady = readinessStatus === "ready" || readinessStatus === "occupied";
  const needsAttention = hasUpcomingBooking && !isReady;
  const nextBooking = allUpcoming[0];
  const readinessConfig = STATUS_CONFIG[readinessStatus] || STATUS_CONFIG.ready;

  return (
    <div className="space-y-6">
      {/* Alert if unit has upcoming booking but is not ready */}
      {needsAttention && nextBooking && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900 mb-1">⚠️ تنبيه: الوحدة غير جاهزة</h3>
            <p className="text-sm text-yellow-800">
              يوجد حجز قادم في <strong>{new Date(nextBooking.start_date).toLocaleDateString("ar-EG")}</strong>
              {" "}لكن الوحدة حالياً في حالة <strong>{readinessConfig.label}</strong>.
              يرجى تحديث حالة الجاهزية قبل موعد الحجز.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/units" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowRight className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{unit.unit_name}</h1>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {unit.unit_code && (
                <span className="text-gray-500">كود: {unit.unit_code}</span>
              )}
              {(unit.unit_calendars || []).map((cal: any) => (
                <span
                  key={cal.id}
                  className={`px-2 py-1 rounded text-xs ${cal.platform === "airbnb"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                    }`}
                  title={cal.is_primary ? "تقويم رئيسي" : cal.platform_account?.account_name || ""}
                >
                  {cal.platform === "airbnb" ? "🏠 Airbnb" : "💬 Gathern"}
                  {cal.is_primary && " ⭐"}
                </span>
              ))}
              {(!unit.unit_calendars || unit.unit_calendars.length === 0) && (
                <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                  بدون منصات
                </span>
              )}
              <span
                className={`px-2 py-1 rounded text-xs ${unit.status === "active"
                  ? "bg-green-100 text-green-600"
                  : "bg-gray-100 text-gray-600"
                  }`}
              >
                {unit.status === "active" ? "نشطة" : "غير نشطة"}
              </span>
              <span className={`px-2 py-1 rounded text-xs ${readinessConfig.color}`}>
                {readinessConfig.icon} {readinessConfig.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/units/${id}/calendars`}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            إدارة التقويم
          </Link>
          {canEdit && (
            <Link
              href={`/dashboard/units/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              تعديل
            </Link>
          )}
        </div>
      </div>

      {/* Unit Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-lg mb-4">معلومات الوحدة</h2>
          <div className="space-y-3">
            {unit.city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>{unit.city}</span>
              </div>
            )}
            {unit.address && (
              <p className="text-gray-600 text-sm">{unit.address}</p>
            )}
            {unit.capacity && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span>{unit.capacity} أشخاص</span>
              </div>
            )}
            <p className="text-gray-500 text-sm">
              المنصات: {(unit.unit_calendars || []).map((cal: any) => cal.platform_account?.account_name || cal.platform).join(", ") || "لا توجد منصات"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              جاهزية الوحدة
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`px-3 py-2 rounded-lg text-sm font-medium ${readinessConfig.color}`}>
                {readinessConfig.icon} {readinessConfig.label}
              </span>
            </div>
            {unit.readiness_guest_name && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">الضيف:</span> {unit.readiness_guest_name}
              </div>
            )}
            {unit.readiness_checkin_date && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">دخول:</span>{" "}
                {new Date(unit.readiness_checkin_date).toLocaleDateString("ar-EG")}
              </div>
            )}
            {unit.readiness_checkout_date && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">خروج:</span>{" "}
                {new Date(unit.readiness_checkout_date).toLocaleDateString("ar-EG")}
              </div>
            )}
            {unit.readiness_notes && (
              <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {unit.readiness_notes}
              </div>
            )}
            <div className="pt-2">
              <UpdateStatusButton unit={unit} currentStatus={readinessStatus} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              الحجوزات القادمة
            </h2>
            <span className="text-gray-500 text-sm">
              {allUpcoming.length}
            </span>
          </div>
          {allUpcoming.length > 0 ? (
            <div className="space-y-2">
              {allUpcoming.map((item: any) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{item.guest_name}</span>
                    <div className="flex items-center gap-2">
                      {item.type === "manual" ? (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">يدوي</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">iCal</span>
                      )}
                      {item.platform && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {item.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{new Date(item.start_date).toLocaleDateString("ar-EG")}</span>
                    <span>←</span>
                    <span>{new Date(item.end_date).toLocaleDateString("ar-EG")}</span>
                  </div>
                  {item.amount && (
                    <div className="text-xs text-green-600 mt-1 font-medium">
                      {item.amount} {item.currency || "SAR"}
                    </div>
                  )}
                  {item.summary && (
                    <p className="text-gray-500 text-xs mt-1">{item.summary}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">لا توجد حجوزات قادمة</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              تذاكر الصيانة
            </h2>
            <Link
              href={`/dashboard/maintenance/new?unit=${id}`}
              className="text-blue-600 text-sm hover:underline"
            >
              + جديدة
            </Link>
          </div>
          {openTickets && openTickets.length > 0 ? (
            <div className="space-y-2">
              {openTickets.map((ticket: any) => (
                <div key={ticket.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{ticket.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${ticket.status === "open"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                        }`}
                    >
                      {ticket.status === "open" ? "مفتوحة" : "قيد التنفيذ"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">لا توجد تذاكر مفتوحة ✓</p>
          )}
        </div>
      </div>

      {/* All Reservations & Bookings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4">جميع الحجوزات</h2>
        {(() => {
          const allBookings = [
            ...(unit.reservations || []).map((r: any) => ({
              id: r.id,
              type: "ical",
              start_date: r.start_date,
              end_date: r.end_date,
              summary: r.summary,
              platform: r.platform,
              guest_name: r.summary || "حجز من iCal",
            })),
            ...(unit.bookings || []).map((b: any) => ({
              id: b.id,
              type: "manual",
              start_date: b.checkin_date,
              end_date: b.checkout_date,
              summary: b.notes,
              platform: b.platform,
              guest_name: b.guest_name,
              amount: b.amount,
              currency: b.currency,
              phone: b.phone,
              platform_account: b.platform_account,
            })),
          ].sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

          return allBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2 px-4">النوع</th>
                    <th className="text-right py-2 px-4">الضيف</th>
                    <th className="text-right py-2 px-4">تاريخ البداية</th>
                    <th className="text-right py-2 px-4">تاريخ النهاية</th>
                    <th className="text-right py-2 px-4">المنصة</th>
                    <th className="text-right py-2 px-4">المبلغ</th>
                    <th className="text-right py-2 px-4">ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">
                        {item.type === "manual" ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">يدوي</span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">iCal</span>
                        )}
                      </td>
                      <td className="py-2 px-4 font-medium">{item.guest_name}</td>
                      <td className="py-2 px-4">
                        {new Date(item.start_date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-2 px-4">
                        {new Date(item.end_date).toLocaleDateString("ar-EG")}
                      </td>
                      <td className="py-2 px-4">
                        {item.platform ? (
                          <span
                            className={`px-2 py-1 rounded text-xs ${item.platform === "airbnb"
                              ? "bg-red-100 text-red-600"
                              : item.platform === "gathern"
                                ? "bg-green-100 text-green-600"
                                : "bg-gray-100 text-gray-600"
                              }`}
                          >
                            {item.platform}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 px-4">
                        {item.amount ? (
                          <span className="text-green-600 font-medium">
                            {item.amount} {item.currency || "SAR"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 px-4 text-gray-500 text-sm">
                        {item.summary || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">لا توجد حجوزات</p>
          );
        })()}
      </div>
    </div>
  );
}


