import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { checkUserPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Building2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { UnitsPageClient } from "./UnitsPageClient";
import { UnitsDeleteButton } from "./UnitsDeleteButton";
import { UnitsFilter } from "./UnitsFilter";

interface UnitCalendar {
  id: string;
  platform: string;
  ical_url: string;
  is_primary: boolean | number;
}

interface Unit {
  id: string;
  unit_name: string;
  unit_code: string | null;
  city: string | null;
  address: string | null;
  capacity: number | null;
  status: string;
  unit_calendars: UnitCalendar[];
}

async function getUnits(): Promise<Unit[]> {
  // Get all units
  const units = await query<any>(
    "SELECT * FROM units ORDER BY created_at DESC"
  );

  // Get calendars for each unit
  for (const unit of units) {
    const calendars = await query<UnitCalendar>(
      "SELECT id, platform, ical_url, is_primary FROM unit_calendars WHERE unit_id = ?",
      [unit.id]
    );
    // Convert MySQL boolean
    unit.unit_calendars = calendars.map((cal) => ({
      ...cal,
      is_primary: cal.is_primary === 1 || cal.is_primary === true,
    }));
  }

  return units;
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; platform?: string; search?: string }> | { status?: string; platform?: string; search?: string };
}) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check view permission
  const canView = await checkUserPermission(session.user.id, "/dashboard/units", "view");
  if (!canView) {
    redirect("/dashboard?error=no_permission");
  }

  // Check edit permission
  const canEdit = await checkUserPermission(session.user.id, "/dashboard/units", "edit");

  const resolvedParams = searchParams instanceof Promise ? await searchParams : (searchParams || {});
  const allUnits = await getUnits();

  // Apply filters
  let units = allUnits;

  if (resolvedParams.status && resolvedParams.status !== "all") {
    units = units.filter((u) => u.status === resolvedParams.status);
  }

  if (resolvedParams.platform && resolvedParams.platform !== "all") {
    const targetPlatform = resolvedParams.platform.toLowerCase();
    units = units.filter((u) => {
      const platforms = (u.unit_calendars || []).map((cal) => cal.platform?.toLowerCase());
      return platforms.includes(targetPlatform);
    });
  }

  if (resolvedParams.search) {
    const searchLower = resolvedParams.search.toLowerCase();
    units = units.filter((u) => {
      const nameMatch = u.unit_name?.toLowerCase().includes(searchLower);
      const codeMatch = u.unit_code?.toLowerCase().includes(searchLower);
      return nameMatch || codeMatch;
    });
  }

  const activeUnits = allUnits.filter((u) => u.status === "active");
  const inactiveUnits = allUnits.filter((u) => u.status === "inactive");

  const hasActiveFilters =
    (resolvedParams.status && resolvedParams.status !== "all") ||
    (resolvedParams.platform && resolvedParams.platform !== "all") ||
    (resolvedParams.search && resolvedParams.search !== "");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">الوحدات</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إدارة جميع الوحدات</p>
        </div>
        {canEdit && <UnitsPageClient />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-blue-500">
          <p className="text-gray-600 text-xs sm:text-sm">إجمالي الوحدات</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{allUnits.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-green-500">
          <p className="text-gray-600 text-xs sm:text-sm">نشطة</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{activeUnits.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-gray-400">
          <p className="text-gray-600 text-xs sm:text-sm">غير نشطة</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{inactiveUnits.length}</p>
        </div>
      </div>

      {/* Filter */}
      <UnitsFilter />

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="text-sm text-gray-600">
          عرض {units.length} من {allUnits.length} وحدة
        </div>
      )}

      {/* Units Grid */}
      {units.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className={`bg-white rounded-lg shadow p-4 hover:shadow-lg transition ${unit.status === "inactive" ? "opacity-60" : ""
                }`}
            >
              <div className="flex justify-between items-start mb-3">
                <Link href={`/dashboard/units/${unit.id}`} className="flex-1">
                  <div>
                    <h3 className="font-semibold text-lg">{unit.unit_name}</h3>
                    {unit.unit_code && (
                      <p className="text-gray-500 text-sm">كود: {unit.unit_code}</p>
                    )}
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                  {(unit.unit_calendars || []).map((cal) => (
                    <div
                      key={cal.id}
                      className="h-6 px-1.5 bg-white border border-gray-200 rounded flex items-center justify-center shadow-sm"
                      title={`${cal.platform} ${cal.is_primary ? '(رئيسي)' : ''}`}
                    >
                      <img
                        src={`/images/platforms/${cal.platform}.svg`}
                        alt={cal.platform}
                        className="h-3.5 w-auto max-w-[40px] object-contain"
                      />
                      {cal.is_primary && <span className="text-[10px] mr-1">⭐</span>}
                    </div>
                  ))}
                  {(!unit.unit_calendars || unit.unit_calendars.length === 0) && (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                      بدون منصات
                    </span>
                  )}
                  {canEdit && <UnitsDeleteButton unitId={unit.id} unitName={unit.unit_name} />}
                </div>
              </div>
              <Link href={`/dashboard/units/${unit.id}`}>
                {unit.city && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{unit.city}</span>
                  </div>
                )}
                {unit.capacity && (
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{unit.capacity} أشخاص</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t">
                  <span
                    className={`px-2 py-1 rounded text-xs ${unit.status === "active"
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    {unit.status === "active" ? "نشطة" : "غير نشطة"}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">لا توجد وحدات</p>
          {canEdit && (
            <Link href="/dashboard/units/new" className="text-blue-600 mt-2 inline-block">
              أضف وحدتك الأولى
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
