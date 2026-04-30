import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET all browser accounts
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await query(
      "SELECT * FROM browser_accounts ORDER BY created_at DESC"
    );
    return NextResponse.json(accounts);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// POST create new browser account
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(user.id, "/dashboard/browser-accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الإنشاء" }, { status: 403 });
  }

  const body = await request.json();
  const { platform, account_name, account_email, notes, platform_account_id } = body;

  if (!platform || !account_name) {
    return NextResponse.json({ error: "Platform and account name required" }, { status: 400 });
  }

  try {
    // Enforce one-to-one link for non-WhatsApp platforms
    if (platform !== "whatsapp" && platform_account_id) {
      const existingLink = await queryOne<{ id: string; account_name: string }>(
        "SELECT id, account_name FROM browser_accounts WHERE platform_account_id = ? AND platform != 'whatsapp'",
        [platform_account_id]
      );

      if (existingLink) {
        return NextResponse.json(
          { error: `حساب المنصة مرتبط بالفعل بحساب متصفح آخر (${existingLink.account_name})` },
          { status: 400 }
        );
      }
    }

    // Generate unique session partition
    const session_partition = `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const accountId = generateUUID();

    await execute(
      `INSERT INTO browser_accounts (id, platform, account_name, account_email, notes, platform_account_id, session_partition, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        accountId,
        platform,
        account_name,
        account_email || null,
        notes || null,
        platform === "whatsapp" ? null : platform_account_id || null,
        session_partition,
        user.id,
      ]
    );

    const account = await queryOne("SELECT * FROM browser_accounts WHERE id = ?", [accountId]);

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "create",
      page_path: "/dashboard/browser-accounts",
      resource_type: "browser_account",
      resource_id: accountId,
      description: `إنشاء حساب متصفح جديد: ${account_name} (${platform})`,
      metadata: { account_name, platform },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "حساب المنصة مرتبط بالفعل بحساب متصفح آخر" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
