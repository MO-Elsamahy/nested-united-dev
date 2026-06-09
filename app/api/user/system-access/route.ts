import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasSystemAccess } from "@/lib/permissions";

const SYSTEMS = ["rentals", "maintenance", "accounting", "hr", "crm", "analytics"];

/**
 * Returns which systems the current user can access.
 * Used by client components (AppSwitcher, etc.) to show/hide modules.
 */
export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessMap: Record<string, boolean> = {};
    for (const sys of SYSTEMS) {
        accessMap[sys] = await hasSystemAccess(user.role, sys);
    }

    // Employee portal and settings have special rules
    accessMap["employee"] = true; // Everyone can access
    accessMap["settings"] = user.role === "super_admin";

    return NextResponse.json(accessMap);
}
