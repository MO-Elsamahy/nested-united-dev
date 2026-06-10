import { NextRequest, NextResponse } from "next/server";
import { query, execute, generateUUID } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// GET all investors
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  try {
    const investors = await query<any>(
      "SELECT id, name, default_profit_share, notes, created_at FROM investors ORDER BY name"
    );

    // Fetch linked platform accounts and units for each investor
    for (const inv of investors) {
      inv.platform_accounts = await query(
        "SELECT id, platform, account_name, notes FROM platform_accounts WHERE investor_id = ? ORDER BY platform",
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

    return NextResponse.json(investors);
  } catch (error: any) {
    console.error("GET /api/investors Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء جلب بيانات المستثمرين" }, { status: 500 });
  }
}

// POST create new investor
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  // Check permission (shared with accounts management)
  const hasPermission = await checkUserPermission(user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الإضافة" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, default_profit_share, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المستثمر مطلوب" }, { status: 400 });
    }

    const investorId = generateUUID();
    const pct = default_profit_share !== undefined ? Number(default_profit_share) : 100.00;

    await execute(
      `INSERT INTO investors (id, name, default_profit_share, notes)
       VALUES (?, ?, ?, ?)`,
      [investorId, name, pct, notes || null]
    );

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "create",
      page_path: "/dashboard/accounts",
      resource_type: "investor",
      resource_id: investorId,
      description: `إضافة مستثمر جديد: ${name} (نسبة الربح الافتراضية: ${pct}%)`,
      metadata: { name, default_profit_share: pct },
    });

    return NextResponse.json(
      { id: investorId, name, default_profit_share: pct, notes },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/investors Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إضافة المستثمر" }, { status: 500 });
  }
}
