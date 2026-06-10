import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

import { queryOne, execute } from "@/lib/db";
import { logActivityInServer, clearPermissionCacheForUser } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getCurrentUser();

  if (!authUser) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  if (authUser.role !== "super_admin") {
    return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
  }

  const targetUser = await queryOne(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(targetUser);
}

// PUT update user (name, email, role)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getCurrentUser();

  if (!authUser) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  if (authUser.role !== "super_admin") {
    return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, role } = body;

  // Get old user data for logging
  const oldUser = await queryOne<{ name: string; email: string; role: string }>(
    "SELECT name, email, role FROM users WHERE id = ?",
    [id]
  );

  if (!oldUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build update query
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (name) {
    updates.push("name = ?");
    values.push(name);
  }
  if (email) {
    updates.push("email = ?");
    values.push(email);
  }
  if (role) {
    updates.push("role = ?");
    values.push(role);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(id);

  try {
    await execute(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // Get updated user
    const updatedUser = await queryOne(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    // Log activity
    const changes: string[] = [];
    if (name && name !== oldUser.name) changes.push(`الاسم: ${oldUser.name} → ${name}`);
    if (email && email !== oldUser.email) changes.push(`البريد: ${oldUser.email} → ${email}`);
    if (role && role !== oldUser.role) changes.push(`الدور: ${oldUser.role} → ${role}`);

    await logActivityInServer({
      userId: authUser.id,
      action_type: "update",
      page_path: "/dashboard/users",
      resource_type: "user",
      resource_id: id,
      description: `تحديث مستخدم: ${oldUser.name} - ${changes.join(", ")}`,
      metadata: { user_id: id, changes },
    });

    // Clear permission cache for updated user
    clearPermissionCacheForUser(id);

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getCurrentUser();

  if (!authUser) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  if (authUser.role !== "super_admin") {
    return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
  }

  // Prevent deleting yourself
  if (id === authUser.id) {
    return NextResponse.json({ error: "لا يمكنك حذف نفسك" }, { status: 400 });
  }

  // Get user data before delete for logging
  const targetUser = await queryOne<{ name: string; email: string }>(
    "SELECT name, email FROM users WHERE id = ?",
    [id]
  );

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { executeTransaction } = await import("@/lib/db");

    await executeTransaction(async (conn) => {
      // 1. Get linked employee id (if any)
      const emp = await queryOne<{ id: string }>(
        "SELECT id FROM hr_employees WHERE user_id = ?",
        [id]
      );
      const empId = emp?.id || null;

      if (empId) {
        // 2. Delete all HR sub-records for this employee
        await conn.execute("DELETE FROM hr_payroll_details WHERE employee_id = ?", [empId]);
        await conn.execute("DELETE FROM hr_attendance WHERE employee_id = ?", [empId]);
        await conn.execute("DELETE FROM hr_requests WHERE employee_id = ?", [empId]);
        await conn.execute("DELETE FROM hr_evaluations WHERE employee_id = ?", [empId]);
        // hr_messages: try both possible column name patterns
        try {
          await conn.execute(
            "DELETE FROM hr_messages WHERE recipient_employee_id = ? OR sender_employee_id = ?",
            [empId, empId]
          );
        } catch {
          // Table or column may not exist — skip silently
        }
        await conn.execute("DELETE FROM hr_employees WHERE id = ?", [empId]);
      }

      // 3. Delete notifications linked to this user
      await conn.execute("DELETE FROM notifications WHERE recipient_user_id = ?", [id]);

      // 4. Hard delete the user record
      await conn.execute("DELETE FROM users WHERE id = ?", [id]);
    });

    // Log activity
    await logActivityInServer({
      userId: authUser.id,
      action_type: "delete",
      page_path: "/dashboard/users",
      resource_type: "user",
      resource_id: id,
      description: `حذف نهائي للمستخدم: ${targetUser.name} (${targetUser.email})`,
      metadata: { user_id: id, user_name: targetUser.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
