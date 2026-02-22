import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { logActivityInServer, clearPermissionCacheForUser } from "@/lib/permissions";

interface UserPermission {
  id: string;
  user_id: string;
  page_path: string;
  can_view: boolean | number;
  can_edit: boolean | number;
}

// Get user permissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow users to fetch their own permissions OR super_admin to fetch anyone's
  const currentUser = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [session.user.id]
  );

  const isOwnPermissions = session.user.id === id;
  const isSuperAdmin = currentUser?.role === "super_admin";

  if (!isOwnPermissions && !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get user permissions
  const permissions = await query<UserPermission>(
    "SELECT * FROM user_permissions WHERE user_id = ? ORDER BY page_path",
    [id]
  );

  // Convert MySQL booleans
  const formattedPermissions = permissions.map((p) => ({
    ...p,
    can_view: p.can_view === 1 || p.can_view === true,
    can_edit: p.can_edit === 1 || p.can_edit === true,
  }));

  return NextResponse.json({ permissions: formattedPermissions });
}

// Update user permissions
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
  const { permissions } = body;

  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: "Invalid permissions format" }, { status: 400 });
  }

  try {
    // Delete existing permissions for this user
    await execute("DELETE FROM user_permissions WHERE user_id = ?", [id]);

    // Get target user name for logging
    const targetUser = await queryOne<{ name: string }>(
      "SELECT name FROM users WHERE id = ?",
      [id]
    );

    // Insert new permissions
    if (permissions.length > 0) {
      for (const p of permissions) {
        await execute(
          `INSERT INTO user_permissions (id, user_id, page_path, can_view, can_edit)
           VALUES (?, ?, ?, ?, ?)`,
          [
            generateUUID(),
            id,
            p.page_path,
            p.can_view ? 1 : 0,
            p.can_edit ? 1 : 0,
          ]
        );
      }
    }

    // Clear permission cache for this user
    clearPermissionCacheForUser(id);

    // Log activity
    await logActivityInServer({
      userId: session.user.id,
      action_type: "update",
      page_path: "/dashboard/users",
      resource_type: "user_permissions",
      resource_id: id,
      description: `تحديث صلاحيات المستخدم: ${targetUser?.name || id}`,
      metadata: { user_id: id, permissions_count: permissions.length },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
