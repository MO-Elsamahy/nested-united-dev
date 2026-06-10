import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { execute, query, generateUUID } from "@/lib/db";
import { SYSTEM_PAGES } from "@/lib/navigation-config";
import { clearPermissionCacheForUser } from "@/lib/permissions";

interface UserRow {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
}

interface PermissionRow {
    user_id: string;
    page_path: string;
    can_view: number | boolean;
    can_edit: number | boolean;
}

// GET: Fetch users with access to a system and their page permissions
export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("system") || "rentals";

    try {
        // Get roles that have access to this system
        const rolePerms = await query<{ role: string }>(
            "SELECT role FROM role_system_permissions WHERE system_id = ? AND can_access = TRUE",
            [systemId]
        );
        const allowedRoles = rolePerms.map((r) => r.role);

        // Super admin always has access
        if (!allowedRoles.includes("super_admin")) {
            allowedRoles.push("super_admin");
        }

        if (allowedRoles.length === 0) {
            return NextResponse.json({ users: [], pages: SYSTEM_PAGES[systemId] || [] });
        }

        // Get users with those roles (excluding super_admin from UI since they have full access)
        const placeholders = allowedRoles.filter(r => r !== 'super_admin').map(() => "?").join(",");
        const usersQuery = placeholders
            ? `SELECT id, name, email, role FROM users WHERE role IN (${placeholders}) AND is_active = TRUE`
            : `SELECT id, name, email, role FROM users WHERE 1=0`; // No users if only super_admin

        const users = placeholders ? await query<UserRow>(usersQuery, allowedRoles.filter(r => r !== 'super_admin')) : [];

        // Get their page permissions
        const userIds = users.map((u) => u.id);
        let permissions: PermissionRow[] = [];
        if (userIds.length > 0) {
            const permPlaceholders = userIds.map(() => "?").join(",");
            permissions = await query<PermissionRow>(
                `SELECT user_id, page_path, can_view, can_edit FROM user_permissions WHERE user_id IN (${permPlaceholders})`,
                userIds
            );
        }

        // Build response
        const usersWithPerms = users.map((user) => ({
            ...user,
            permissions: permissions
                .filter((p) => p.user_id === user.id)
                .reduce((acc: Record<string, { can_view: boolean; can_edit: boolean }>, p) => {
                    acc[p.page_path] = { can_view: Boolean(p.can_view), can_edit: Boolean(p.can_edit) };
                    return acc;
                }, {}),
        }));

        return NextResponse.json({
            users: usersWithPerms,
            pages: SYSTEM_PAGES[systemId] || [],
            system: systemId,
        });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}

// POST: Update a user's page permission
export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "super_admin") {
        return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { user_id, page_path, can_view, can_edit } = body;

        // Upsert permission
        await execute(
            `INSERT INTO user_permissions (id, user_id, page_path, can_view, can_edit)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE can_view = ?, can_edit = ?`,
            [generateUUID(), user_id, page_path, can_view, can_edit || false, can_view, can_edit || false]
        );

        // Clear permission cache for that user
        clearPermissionCacheForUser(user_id);

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
