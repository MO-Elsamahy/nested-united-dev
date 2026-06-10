import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { checkUserPermission } from "@/lib/permissions";
import { hasPermission } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import { AccountsPageContent } from "./AccountsPageContent";
import { PlatformAccount } from "@/lib/types/database";

interface Investor {
  id: string;
  name: string;
  default_profit_share: number;
  notes: string | null;
  platform_accounts: PlatformAccount[];
  units: any[];
}

async function getInvestors(): Promise<Investor[]> {
  const investors = await query<any>(
    "SELECT id, name, default_profit_share, notes, created_at FROM investors ORDER BY name"
  );
  for (const inv of investors) {
    inv.platform_accounts = await query(
      "SELECT id, platform, account_name, notes, investor_id, created_at FROM platform_accounts WHERE investor_id = ? ORDER BY platform",
      [inv.id]
    );
    inv.units = await query(
      `SELECT id, unit_name, unit_code, profit_share, 
              COALESCE(profit_share, ?) as actual_profit_share 
       FROM units 
       WHERE investor_id = ? AND status != 'archived'
       ORDER BY unit_name`,
      [inv.default_profit_share, inv.id]
    );
  }
  return investors;
}

async function getPlatformAccounts(): Promise<PlatformAccount[]> {
  const accounts = await query<PlatformAccount>(
    "SELECT id, platform, account_name, notes, investor_id, created_at FROM platform_accounts ORDER BY platform, created_at DESC"
  );
  return accounts;
}

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check permission to view
  const canView = await checkUserPermission(session.user.id, "/dashboard/accounts", "view");
  if (!canView) {
    redirect("/dashboard?error=no_permission");
  }

  const [investors, platformAccounts] = await Promise.all([
    getInvestors(),
    getPlatformAccounts(),
  ]);

  const canEdit = await hasPermission("/dashboard/accounts", "edit");

  return (
    <AccountsPageContent
      initialInvestors={investors}
      initialPlatformAccounts={platformAccounts}
      canEdit={canEdit}
    />
  );
}
