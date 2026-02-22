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

  // For maintenance workers, check permissions table first
  if (user.role === "maintenance_worker") {
    if (permission) {
      // Permission exists in database, use it
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
    } else {
      // No permission in database, use default:
      // - /dashboard/maintenance
      // - /dashboard/unit-readiness
      const defaultPages = ["/dashboard/maintenance", "/dashboard/unit-readiness"];
      const canView = defaultPages.includes(pagePath);
      const canEdit = canView;
      const result = action === "view" ? canView : canEdit;
      serverPermissionCache.set(cacheKey, { result, timestamp: now });
      return result;
    }
  }

  // For admins, check permissions table
  if (!permission) {
    // If no specific permissions, give admins full access by default
    if (user.role === "admin") {
      serverPermissionCache.set(cacheKey, { result: true, timestamp: now });
      return true;
    }

    // Any other role without explicit permission → deny
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
  metadata?: any;
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
