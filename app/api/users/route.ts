import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query, queryOne } from "@/lib/db";

// GET all users (super admin only)
export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  // Check if current user is super admin
  const currentUser = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [user.id]
  );

  if (currentUser?.role !== "super_admin") {
    return NextResponse.json({ error: "عذراً، لا تملك الصلاحية للقيام بهذا الإجراء" }, { status: 403 });
  }

  const users = await query(
    "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC"
  );

  return NextResponse.json(users);
}
