import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/server-permissions";
import { checkUserPermission } from "@/lib/permissions";
import { AnalyticsDashboardClient } from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string;
  ids: string;
}

interface SyncLog {
  run_at: string;
  status: string;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const activeTab = (resolvedSearchParams.tab || "executive") as "executive" | "live_ops" | "profitability" | "crm" | "hr";

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Enforce page-level permissions dynamically per tab
  const userRole = (session.user as { role?: string }).role || "employee";
  
  if (userRole !== "super_admin") {
    const analyticsPages = [
      { tab: "executive", path: "/analytics" },
      { tab: "live_ops", path: "/analytics?tab=live_ops" },
      { tab: "profitability", path: "/analytics?tab=profitability" },
      { tab: "crm", path: "/analytics?tab=crm" },
      { tab: "hr", path: "/analytics?tab=hr" },
    ];

    const permissions = await Promise.all(
      analyticsPages.map(async (page) => {
        const allowed = await checkUserPermission(session.user.id, page.path, "view");
        return { tab: page.tab, path: page.path, allowed };
      })
    );

    const allowedTabs = permissions.filter(p => p.allowed);

    if (allowedTabs.length === 0) {
      redirect("/dashboard?error=no_permission");
    }

    const requestedPermission = permissions.find(p => p.tab === activeTab);
    if (!requestedPermission || !requestedPermission.allowed) {
      // Redirect to the first allowed tab if the user tries to access a restricted one
      const firstAllowed = allowedTabs[0];
      redirect(firstAllowed.path);
    }
  }

  // 2. Fetch platform accounts for filter
  let accounts: PlatformAccount[] = [];
  try {
    accounts = await query<PlatformAccount>(
      "SELECT MIN(id) as id, platform, account_name, GROUP_CONCAT(id) as ids FROM platform_accounts WHERE platform != 'whatsapp' GROUP BY account_name ORDER BY account_name ASC"
    );
  } catch (error) {
    console.error("Error fetching accounts for analytics:", error);
  }

  // 3. Fetch last sync log details
  let lastSync: SyncLog | null = null;
  try {
    lastSync = await queryOne<SyncLog>(
      "SELECT run_at, status FROM sync_logs ORDER BY run_at DESC LIMIT 1"
    );
  } catch (error) {
    console.error("Error fetching last sync log:", error);
  }

  return (
    <AnalyticsDashboardClient
      initialAccounts={accounts}
      lastSyncTime={lastSync ? lastSync.run_at : null}
      activeTab={activeTab}
    />
  );
}
