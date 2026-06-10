import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

import { queryOne, execute } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET single account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const account = await queryOne(
      "SELECT * FROM platform_accounts WHERE id = ?",
      [id]
    );

    if (!account) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 });
  }
}

// PUT update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية التعديل" }, { status: 403 });
  }

  const body = await request.json();
  const { account_name, notes, investor_id } = body;

  try {
    // Get account before update for logging
    const oldAccount = await queryOne<{ account_name: string; platform: string }>(
      "SELECT account_name, platform FROM platform_accounts WHERE id = ?",
      [id]
    );

    await execute(
      "UPDATE platform_accounts SET account_name = ?, notes = ?, investor_id = ? WHERE id = ?",
      [account_name, notes || null, investor_id || null, id]
    );

    const account = await queryOne(
      "SELECT * FROM platform_accounts WHERE id = ?",
      [id]
    );

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "update",
      page_path: "/dashboard/accounts",
      resource_type: "account",
      resource_id: id,
      description: `تحديث حساب: ${oldAccount?.account_name || account_name}`,
      metadata: { account_id: id, account_name },
    });

    return NextResponse.json(account);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 });
  }
}

// DELETE account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الحذف" }, { status: 403 });
  }

  try {
    // Get account before delete for logging
    const account = await queryOne<{ account_name: string; platform: string }>(
      "SELECT account_name, platform FROM platform_accounts WHERE id = ?",
      [id]
    );

    await execute("DELETE FROM platform_accounts WHERE id = ?", [id]);

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "delete",
      page_path: "/dashboard/accounts",
      resource_type: "account",
      resource_id: id,
      description: `حذف حساب: ${account?.account_name || id}`,
      metadata: { account_id: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "An error occurred" }, { status: 500 });
  }
}
