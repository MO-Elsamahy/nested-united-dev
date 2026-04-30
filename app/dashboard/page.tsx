import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Building2, Calendar, Wrench, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { SyncStatus } from "@/components/SyncStatus";
import { checkUserPermission } from "@/lib/permissions";

interface SyncLog {
  run_at: string;
  status: "success" | "partial" | "failed";
  message: string;
  units_processed: number;
  errors_count: number;
}

async function getDashboardStats() {
  const today = new Date().toISOString().split("T")[0];

  // Total units
  const totalUnitsResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM units WHERE status = 'active'"
  );
  const totalUnits = totalUnitsResult?.count || 0;

  // Units booked today - from bookings table (manual) + reservations (iCal)
  const bookingsToday = await query<{ unit_id: string }>(
    `SELECT DISTINCT unit_id FROM bookings 
     WHERE checkin_date <= ? AND checkout_date >= ?`,
    [today, today]
  );

  const reservationsToday = await query<{ unit_id: string }>(
    `SELECT DISTINCT unit_id FROM reservations 
     WHERE start_date <= ? AND end_date >= ?`,
    [today, today]
  );

  const uniqueUnitsToday = new Set([
    ...bookingsToday.map((b) => b.unit_id),
    ...reservationsToday.map((r) => r.unit_id),
  ]).size;

  // Upcoming check-ins (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  const upcomingBookingsResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM bookings 
     WHERE checkin_date >= ? AND checkin_date <= ?`,
    [today, nextWeekStr]
  );

  const upcomingReservationsResult = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM reservations 
     WHERE start_date >= ? AND start_date <= ?`,
    [today, nextWeekStr]
  );

  const upcomingCheckIns = (upcomingBookingsResult?.count || 0) + (upcomingReservationsResult?.count || 0);

  // Open maintenance tickets
  const openTicketsResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM maintenance_tickets WHERE status IN ('open', 'in_progress')"
  );
  const openTickets = openTicketsResult?.count || 0;

  // Last sync
  const lastSync = await queryOne<SyncLog>(
    "SELECT * FROM sync_logs ORDER BY run_at DESC LIMIT 1"
  );

  // Calendars count
  const calendarsResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM unit_calendars"
  );
  const calendarsCount = calendarsResult?.count || 0;

  return {
    totalUnits,
    bookedToday: uniqueUnitsToday,
    upcomingCheckIns,
    openTickets,
    lastSync: lastSync || null,
    calendarsCount,
  };
}

async function getCurrentUserName(userId: string) {
  const user = await queryOne<{ name: string }>(
    "SELECT name FROM users WHERE id = ?",
    [userId]
  );
  return user?.name || "المستخدم";
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  link?: string;
}

function StatCard({ title, value, icon: Icon, color, link }: StatCardProps) {
  const content = (
    <div className={`bg-white rounded-lg shadow p-6 border-r-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gray-100`}>
          <Icon className={`w-8 h-8 ${color.replace("border-", "text-")}`} />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user has permission to view dashboard
  const user = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [session.user.id]
  );

  // For maintenance workers, check if they have permission to view dashboard
  if (user?.role === "maintenance_worker") {
    const hasDashboardPermission = await checkUserPermission(session.user.id, "/dashboard", "view");

    if (!hasDashboardPermission) {
      redirect("/dashboard/maintenance");
    }
  }

  const [userName, stats] = await Promise.all([
    getCurrentUserName(session.user.id),
    getDashboardStats()
  ]);

  const today = new Date().toISOString().split("T")[0];
  const todayBookingsLink = `/dashboard/bookings?today=${today}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          مرحبًا، {userName}
        </h1>
        <p className="text-gray-600">
          نظرة عامة على الوحدات والحجوزات والصيانة
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الوحدات النشطة"
          value={stats.totalUnits}
          icon={Building2}
          color="border-blue-500"
          link="/dashboard/units"
        />
        <StatCard
          title="وحدات محجوزة اليوم"
          value={stats.bookedToday}
          icon={Calendar}
          color="border-green-500"
          link={todayBookingsLink}
        />
        <StatCard
          title="حجوزات قادمة (7 أيام)"
          value={stats.upcomingCheckIns}
          icon={CheckCircle2}
          color="border-purple-500"
          link="/dashboard/bookings/upcoming"
        />
        <StatCard
          title="تذاكر صيانة مفتوحة"
          value={stats.openTickets}
          icon={Wrench}
          color="border-orange-500"
          link="/dashboard/maintenance"
        />
      </div>

      {/* Sync Section */}
      <SyncStatus
        initialLastSync={stats.lastSync}
        calendarsCount={stats.calendarsCount}
      />

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/units"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <Building2 className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">إدارة الوحدات</p>
              <p className="text-sm text-gray-500">عرض وإضافة الوحدات</p>
            </div>
          </Link>

          <Link
            href="/dashboard/maintenance"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition"
          >
            <Wrench className="w-6 h-6 text-orange-600" />
            <div>
              <p className="font-medium text-gray-900">تذاكر الصيانة</p>
              <p className="text-sm text-gray-500">متابعة الصيانة</p>
            </div>
          </Link>

          <Link
            href="/dashboard/accounts"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition"
          >
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">الحسابات</p>
              <p className="text-sm text-gray-500">Airbnb و Gathern</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
