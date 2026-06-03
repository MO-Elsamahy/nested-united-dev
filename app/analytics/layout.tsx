import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne } from "@/lib/db";
import { getAppFeatures } from "@/lib/features";
import { Header } from "@/components/layout/Header";
import { AnalyticsSidebar } from "@/components/layout/AnalyticsSidebar";
import { TabBar } from "@/components/layout/TabBar";
import { ElectronNotificationHandler } from "@/components/ElectronNotificationHandler";
import { NotificationManager } from "@/components/NotificationManager";
import { ActivityLogger } from "@/components/ActivityLogger";
import { AutoSync } from "@/components/AutoSync";
import { AppShell } from "@/components/layout/AppShell";

import { User } from "@/lib/types/database";
import { checkUserPermission } from "@/lib/permissions";

export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = await queryOne<User>(
    "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
    [String(session.user.id)]
  );

  if (!user || (user && !user.is_active)) {
    redirect("/login");
  }

  // RBAC: Check if user can access the Analytics module (fallback to rentals permission)
  const hasAccess = await checkUserPermission(user.id, "/analytics", "view");
  if (!hasAccess) {
    console.warn(`User ${user.email} (role: ${user.role}) attempted unauthorized access to Advanced Analytics`);
    redirect("/portal");
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
        sidebar={<AnalyticsSidebar user={user} features={features} />}
      >
        {children}
      </AppShell>
    </div>
  );
}
