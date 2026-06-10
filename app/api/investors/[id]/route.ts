import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

// PUT update investor details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  const hasPermission = await checkUserPermission(user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية التعديل" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, default_profit_share, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم المستثمر مطلوب" }, { status: 400 });
    }

    const pct = default_profit_share !== undefined ? Number(default_profit_share) : 100.00;

    // Check if exists
    const investor = await queryOne("SELECT id FROM investors WHERE id = ?", [id]);
    if (!investor) {
      return NextResponse.json({ error: "المستثمر غير موجود" }, { status: 404 });
    }

    await execute(
      `UPDATE investors 
       SET name = ?, default_profit_share = ?, notes = ?
       WHERE id = ?`,
      [name, pct, notes || null, id]
    );

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "update",
      page_path: "/dashboard/accounts",
      resource_type: "investor",
      resource_id: id,
      description: `تعديل بيانات المستثمر: ${name} (نسبة الربح: ${pct}%)`,
      metadata: { id, name, default_profit_share: pct },
    });

    return NextResponse.json({ success: true, message: "تم تحديث بيانات المستثمر بنجاح" });
  } catch (error: any) {
    console.error("PUT /api/investors/[id] Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تعديل بيانات المستثمر" }, { status: 500 });
  }
}

// DELETE investor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  const hasPermission = await checkUserPermission(user.id, "/dashboard/accounts", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الحذف" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Check if exists
    const investor = await queryOne<{ name: string }>("SELECT name FROM investors WHERE id = ?", [id]);
    if (!investor) {
      return NextResponse.json({ error: "المستثمر غير موجود" }, { status: 404 });
    }

    // Delete investor record. The constraints ON DELETE SET NULL on units and platform_accounts will automatically unlink them
    await execute("DELETE FROM investors WHERE id = ?", [id]);

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "delete",
      page_path: "/dashboard/accounts",
      resource_type: "investor",
      resource_id: id,
      description: `حذف المستثمر: ${investor.name}`,
      metadata: { id, name: investor.name },
    });

    return NextResponse.json({ success: true, message: "تم حذف المستثمر بنجاح" });
  } catch (error: any) {
    console.error("DELETE /api/investors/[id] Error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء حذف المستثمر" }, { status: 500 });
  }
}
