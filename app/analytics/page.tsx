import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";
import { requirePermission } from "@/lib/server-permissions";
import { AnalyticsDashboardClient } from "./AnalyticsDashboardClient";

export const dynamic = "force-dynamic";

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string;
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

  // 1. Enforce View Permission for /analytics page
  await requirePermission("/analytics", "view");

  // 2. Fetch platform accounts for filter
  let accounts: PlatformAccount[] = [];
  try {
    accounts = await query<PlatformAccount>(
      "SELECT id, platform, account_name FROM platform_accounts ORDER BY account_name ASC"
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
