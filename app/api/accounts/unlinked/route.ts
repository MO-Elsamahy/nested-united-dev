import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

// GET platform accounts that are NOT linked to any browser account
export async function GET() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "super_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    // Get all platform accounts
    const platformAccounts = await query<{ id: string; platform: string; account_name: string }>(
      "SELECT id, platform, account_name FROM platform_accounts ORDER BY created_at DESC"
    );

    // Get all browser accounts with platform_account_id
    const browserAccounts = await query<{ platform_account_id: string }>(
      "SELECT platform_account_id FROM browser_accounts WHERE platform_account_id IS NOT NULL"
    );

    // Filter out linked accounts
    const linkedIds = new Set(browserAccounts.map((ba) => ba.platform_account_id));
    const unlinkedAccounts = platformAccounts.filter((pa) => !linkedIds.has(pa.id));

    return NextResponse.json(unlinkedAccounts);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
