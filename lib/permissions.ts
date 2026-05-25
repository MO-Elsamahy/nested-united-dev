import { queryOne, execute, generateUUID } from "@/lib/db";
import type { UserRole } from "@/lib/types/database";

// Server-side cache for permissions (in-memory, resets on server restart)
const serverPermissionCache = new Map<string, { result: boolean; timestamp: number }>();
const SERVER_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Clear cache for a specific user (called when permissions are updated)
export function clearPermissionCacheForUser(userId: string) {
  const keysToDelete: string[] = [];
  for (const key of serverPermissionCache.keys()) {
    if (key.startsWith(`${userId}:`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => serverPermissionCache.delete(key));
}

interface UserPermission {
  id: string;
  user_id: string;
  page_path: string;
  can_view: boolean | number;
  can_edit: boolean | number;
}

interface UserWithRole {
  id: string;
  role: UserRole;
}

// Default allowed paths for each role (prefixes)
// NOTE: We intentionally have NO hardcoded role defaults here.
// All permissions are managed via the database (role_system_permissions + user_permissions tables).
// Only super_admin is hardcoded (has access to everything).

// Map a page path to its parent system module
function getSystemForPath(pagePath: string): string | null {
  if (pagePath.startsWith("/dashboard")) return "rentals";
  if (pagePath.startsWith("/accounting")) return "accounting";
  if (pagePath.startsWith("/hr")) return "hr";
  if (pagePath.startsWith("/crm")) return "crm";
  if (pagePath.startsWith("/employee")) return "employee";
  if (pagePath.startsWith("/settings")) return "settings";
  return null;
}

export async function checkUserPermission(
  userId: string,
  pagePath: string,
  action: "view" | "edit"
): Promise<boolean> {
  // Check server-side cache first
  const cacheKey = `${userId}:${pagePath}:${action}`;
  const cached = serverPermissionCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < SERVER_CACHE_DURATION) {
    return cached.result;
  }

  // Get user role
  const user = await queryOne<UserWithRole>(
    "SELECT id, role FROM users WHERE id = ?",
    [userId]
  );

  if (!user) {
    serverPermissionCache.set(cacheKey, { result: false, timestamp: now });
    return false;
  }

  // Super admins have all permissions - can do everything
  if (user.role === "super_admin") {
    serverPermissionCache.set(cacheKey, { result: true, timestamp: now });
    return true;
  }

  // Check explicit user-level permission in database first
  const permission = await queryOne<UserPermission>(
    "SELECT * FROM user_permissions WHERE user_id = ? AND page_path = ?",
    [userId, pagePath]
  );

  if (permission) {
    // MySQL returns boolean as 0/1
    const canView = permission.can_view === 1 || permission.can_view === true;
    const canEdit = permission.can_edit === 1 || permission.can_edit === true;

    let result: boolean;
    if (action === "view") {
      result = canView;
    } else {
      result = canEdit && canView;
    }

    serverPermissionCache.set(cacheKey, { result, timestamp: now });
    return result;
  }

  // No explicit user permission — check role-level system access from DB
  const system = getSystemForPath(pagePath);

  // Employee portal is always accessible (self-service)
  if (system === "employee") {
    serverPermissionCache.set(cacheKey, { result: true, timestamp: now });
    return true;
  }

  // Settings is super_admin only (already handled above, deny for everyone else)
  if (system === "settings") {
    serverPermissionCache.set(cacheKey, { result: false, timestamp: now });
    return false;
  }

  if (system) {
    const hasAccess = await hasSystemAccess(user.role, system);
    serverPermissionCache.set(cacheKey, { result: hasAccess, timestamp: now });
    return hasAccess;
  }

  // Unknown path — deny by default
  serverPermissionCache.set(cacheKey, { result: false, timestamp: now });
  return false;
}

// Only log important actions, not page views
const IMPORTANT_ACTIONS = ["create", "update", "delete", "export"];

export async function logActivityInServer(data: {
  userId: string;
  action_type: string;
  page_path?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  // Skip logging page views to reduce database load
  if (data.action_type === "page_view") {
    return;
  }

  // Only log if it's an important action
  if (!IMPORTANT_ACTIONS.includes(data.action_type)) {
    return;
  }

  try {
    await execute(
      `INSERT INTO user_activity_logs 
       (id, user_id, action_type, page_path, resource_type, resource_id, description, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateUUID(),
        data.userId,
        data.action_type,
        data.page_path || null,
        data.resource_type || null,
        data.resource_id || null,
        data.description || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

/**
 * Check if a role has access to a specific system module (e.g., 'hr', 'accounting')
 * Uses the role_system_permissions table.
 */
export async function hasSystemAccess(role: string, systemId: string): Promise<boolean> {
  if (role === "super_admin") return true;

  const perm = await queryOne<{ can_access: number }>(
    "SELECT can_access FROM role_system_permissions WHERE role = ? AND system_id = ?",
    [role, systemId]
  );

  if (perm) return !!perm.can_access;

  // Fallback: if no specific maintenance permission is set, use rentals permission
  // as maintenance is currently a submodule of the rentals dashboard.
  if (systemId === "maintenance") {
    const rentalsPerm = await queryOne<{ can_access: number }>(
      "SELECT can_access FROM role_system_permissions WHERE role = ? AND system_id = 'rentals'",
      [role]
    );
    return !!rentalsPerm?.can_access;
  }

  return false;
}
