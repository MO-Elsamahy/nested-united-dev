import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute } from "@/lib/db";
import { logActivityInServer } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if current user is super admin
  const currentUser = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [session.user.id]
  );

  if (currentUser?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      userId: session.user.id,
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
