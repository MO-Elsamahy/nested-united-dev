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
const ROLE_DEFAULT_PATHS: Record<string, string[]> = {
  super_admin: ["/"], // Everything
  admin: ["/dashboard", "/accounting", "/hr", "/crm"], // Most things
  accountant: ["/accounting", "/dashboard", "/about"],
  hr_manager: ["/hr", "/dashboard", "/about"],
  maintenance_worker: ["/dashboard/maintenance", "/dashboard/unit-readiness", "/dashboard", "/about"],
  employee: ["/dashboard", "/about"],
};

// Paths restricted from regular admins by default
const ADMIN_RESTRICTED_PATHS = ["/dashboard/users", "/dashboard/activity-logs", "/settings/page-permissions"];

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

  // Get permission from database
  const permission = await queryOne<UserPermission>(
    "SELECT * FROM user_permissions WHERE user_id = ? AND page_path = ?",
    [userId, pagePath]
  );

  // If no explicit permission in DB, check role defaults
  if (!permission) {
    // Check if path is restricted for admins
    if (user.role === "admin" && ADMIN_RESTRICTED_PATHS.some(p => pagePath.startsWith(p))) {
      serverPermissionCache.set(cacheKey, { result: false, timestamp: now });
      return false;
    }

    const defaultPaths = ROLE_DEFAULT_PATHS[user.role] || [];
    const isAllowedByDefault = defaultPaths.some(p => p === "/" || pagePath.startsWith(p));

    // Dashboard home is always allowed view
    if (pagePath === "/dashboard" && action === "view") {
        serverPermissionCache.set(cacheKey, { result: true, timestamp: now });
        return true;
    }

    if (isAllowedByDefault) {
      serverPermissionCache.set(cacheKey, { result: true, timestamp: now });
      return true;
    }

    serverPermissionCache.set(cacheKey, { result: false, timestamp: now });
    return false;
  }

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
