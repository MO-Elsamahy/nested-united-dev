import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { logActivityInServer, clearPermissionCacheForUser } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";
import { SYSTEM_PAGES } from "@/lib/navigation-config";

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
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  // Allow users to fetch their own permissions OR super_admin to fetch anyone's
  const isOwnPermissions = user.id === id;
  const isSuperAdmin = user.role === "super_admin";

  if (!isOwnPermissions && !isSuperAdmin) {
    return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
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

  // Fetch the target user's role to determine allowed systems
  const targetUser = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [id]
  );

  const allowedSystems: string[] = [];
  if (targetUser) {
    if (targetUser.role === "super_admin") {
      allowedSystems.push("rentals", "accounting", "hr", "crm", "maintenance");
    } else {
      const perms = await query<{ system_id: string }>(
        "SELECT system_id FROM role_system_permissions WHERE role = ? AND can_access = TRUE",
        [targetUser.role]
      );
      allowedSystems.push(...perms.map(p => p.system_id));
      // Fallback for maintenance if rentals is allowed
      if (allowedSystems.includes("rentals") && !allowedSystems.includes("maintenance")) {
        allowedSystems.push("maintenance");
      }
    }
  }

  // Build the systems object with page lists
  const systems: Record<string, { path: string; label: string }[]> = {};
  for (const sys of allowedSystems) {
    if (SYSTEM_PAGES[sys]) {
      systems[sys] = SYSTEM_PAGES[sys];
    }
  }

  return NextResponse.json({
    permissions: formattedPermissions,
    systems
  });
}

// Update user permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
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
      userId: user.id,
      action_type: "update",
      page_path: "/dashboard/users",
      resource_type: "user_permissions",
      resource_id: id,
      description: `تحديث صلاحيات المستخدم: ${targetUser?.name || id}`,
      metadata: { user_id: id, permissions_count: permissions.length },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
