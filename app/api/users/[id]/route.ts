import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute } from "@/lib/db";
import { logActivityInServer } from "@/lib/permissions";

// GET single user
export async function GET(
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

  const user = await queryOne(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

// PUT update user (name, email, role)
export async function PUT(
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
  const values: any[] = [];

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
      userId: session.user.id,
      action_type: "update",
      page_path: "/dashboard/users",
      resource_type: "user",
      resource_id: id,
      description: `تحديث مستخدم: ${oldUser.name} - ${changes.join(", ")}`,
      metadata: { user_id: id, changes },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
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

  // Prevent deleting yourself
  if (id === session.user.id) {
    return NextResponse.json({ error: "لا يمكنك حذف نفسك" }, { status: 400 });
  }

  // Get user data before delete for logging
  const user = await queryOne<{ name: string; email: string }>(
    "SELECT name, email FROM users WHERE id = ?",
    [id]
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    await execute("DELETE FROM users WHERE id = ?", [id]);

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "delete",
      page_path: "/dashboard/users",
      resource_type: "user",
      resource_id: id,
      description: `حذف مستخدم: ${user.name} (${user.email})`,
      metadata: { user_id: id, user_name: user.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
