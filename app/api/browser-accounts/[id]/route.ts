import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne, execute } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET single browser account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const account = await queryOne(
      "SELECT * FROM browser_accounts WHERE id = ?",
      [id]
    );

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH update browser account
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(user.id, "/dashboard/browser-accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية التعديل" }, { status: 403 });
  }

  // Get account before update for logging
  const oldAccount = await queryOne<{ account_name: string; platform: string }>(
    "SELECT account_name, platform FROM browser_accounts WHERE id = ?",
    [id]
  );

  const body = await request.json();

  // Build update query
  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (key !== "id") {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  updates.push("updated_at = NOW()");
  values.push(id);

  try {
    await execute(
      `UPDATE browser_accounts SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "update",
      page_path: "/dashboard/browser-accounts",
      resource_type: "browser_account",
      resource_id: id,
      description: `تحديث حساب متصفح: ${oldAccount?.account_name || id}`,
      metadata: { account_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE browser account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(user.id, "/dashboard/browser-accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الحذف" }, { status: 403 });
  }

  // Get account before delete for logging
  const account = await queryOne<{ account_name: string; platform: string }>(
    "SELECT account_name, platform FROM browser_accounts WHERE id = ?",
    [id]
  );

  try {
    await execute("DELETE FROM browser_accounts WHERE id = ?", [id]);

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "delete",
      page_path: "/dashboard/browser-accounts",
      resource_type: "browser_account",
      resource_id: id,
      description: `حذف حساب متصفح: ${account?.account_name || id}`,
      metadata: { account_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
