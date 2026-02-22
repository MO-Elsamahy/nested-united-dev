import { NextResponse } from "next/server";
import { execute, query, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Define the systems
const SYSTEMS = ['rentals', 'accounting', 'hr', 'crm'];
const ROLES = ['super_admin', 'admin', 'accountant', 'hr_manager', 'maintenance_worker', 'employee'];

// GET: Fetch all role-system permissions
export async function GET() {
    try {
        const rows = await query("SELECT * FROM role_system_permissions");

        // Transform to matrix format
        const matrix: Record<string, Record<string, boolean>> = {};
        for (const role of ROLES) {
            matrix[role] = {};
            for (const sys of SYSTEMS) {
                // Super admin always has access
                if (role === 'super_admin') {
                    matrix[role][sys] = true;
                } else {
                    const perm = rows.find((r: any) => r.role === role && r.system_id === sys);
                    matrix[role][sys] = perm ? Boolean(perm.can_access) : false;
                }
            }
        }

        return NextResponse.json({ permissions: matrix, systems: SYSTEMS, roles: ROLES });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST: Update permissions
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { role, system_id, can_access } = body;

        // Don't allow modifying super_admin
        if (role === 'super_admin') {
            return NextResponse.json({ error: "Cannot modify super_admin permissions" }, { status: 400 });
        }

        // Upsert
        await execute(`
      INSERT INTO role_system_permissions (id, role, system_id, can_access)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE can_access = ?
    `, [generateUUID(), role, system_id, can_access, can_access]);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
