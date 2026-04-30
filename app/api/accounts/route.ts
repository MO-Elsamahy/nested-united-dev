import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET all accounts
export async function GET() {
  try {
    const accounts = await query(
      "SELECT * FROM platform_accounts ORDER BY created_at DESC"
    );
    return NextResponse.json(accounts);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error instanceof Error ? error.message : 'Internal Server Error' : 'Internal Server Error' }, { status: 500 });
  }
}

// POST create new account
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الإنشاء" }, { status: 403 });
  }

  const body = await request.json();
  const { platform, account_name, notes } = body;

  if (!platform || !account_name) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const accountId = generateUUID();

  try {
    await execute(
      `INSERT INTO platform_accounts (id, platform, account_name, notes, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [accountId, platform, account_name, notes || null, session.user.id]
    );

    const account = await queryOne(
      "SELECT * FROM platform_accounts WHERE id = ?",
      [accountId]
    );

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "create",
      page_path: "/dashboard/accounts",
      resource_type: "account",
      resource_id: accountId,
      description: `إنشاء حساب جديد: ${account_name} (${platform})`,
      metadata: { account_name, platform },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error instanceof Error ? error.message : 'Internal Server Error' : 'Internal Server Error' }, { status: 500 });
  }
}
