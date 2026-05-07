import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { logActivityInServer } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  // Get current user status and name
  const targetUser = await queryOne<{ is_active: number | boolean; name: string }>(
    "SELECT is_active, name FROM users WHERE id = ?",
    [id]
  );

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const currentActive = targetUser.is_active === 1 || targetUser.is_active === true;
  const newStatus = !currentActive;

  // Toggle status
  try {
    await execute(
      "UPDATE users SET is_active = ? WHERE id = ?",
      [newStatus ? 1 : 0, id]
    );

    // Log activity
    await logActivityInServer({
      userId: user.id,
      action_type: "update",
      page_path: "/dashboard/users",
      resource_type: "user",
      resource_id: id,
      description: `${newStatus ? "تفعيل" : "تعطيل"} المستخدم: ${targetUser.name}`,
      metadata: { user_id: id, is_active: newStatus },
    });

    return NextResponse.json({ success: true, is_active: newStatus });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
