import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne } from "@/lib/db";
import { getAppFeatures } from "@/lib/features";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { TabBar } from "@/components/layout/TabBar";
import { ElectronNotificationHandler } from "@/components/ElectronNotificationHandler";
import { NotificationManager } from "@/components/NotificationManager";
import { ActivityLogger } from "@/components/ActivityLogger";
import { AutoSync } from "@/components/AutoSync";
import { AppShell } from "@/components/layout/AppShell";

import { User } from "@/lib/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Get user data from users table
  console.log("Session User ID:", session.user.id);
  const user = await queryOne<User>(
    "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
    [String(session.user.id)]
  );

  if (!user || (user && !user.is_active)) {
    redirect("/login");
  }

  // RBAC: Check if user can access the Rentals (Dashboard) module
  if (user.role !== 'super_admin') {
    const perm = await queryOne<{ can_access: number }>(
      "SELECT can_access FROM role_system_permissions WHERE role = ? AND system_id = 'rentals'",
      [user.role]
    );
    if (!perm || !perm.can_access) {
      console.warn(`User ${user.email} (role: ${user.role}) attempted unauthorized access to Rentals Dashboard`);
      redirect("/portal");
    }
  }

  // Get unread notifications count
  const countResult = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM notifications WHERE is_read = FALSE"
  );
  const unreadCount = countResult?.count || 0;

  // Features manifest
  const features = await getAppFeatures();

  if (!features.rentals) {
    notFound();
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ElectronNotificationHandler />
      <NotificationManager />
      <ActivityLogger />
      <AutoSync />

      <TabBar />

      <AppShell
        header={<Header user={user} unreadCount={unreadCount} features={features} />}
        sidebar={<Sidebar user={user} features={features} />}
      >
        {children}
      </AppShell>
    </div>
  );
}
