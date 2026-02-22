import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

// GET all users (super admin only)
export async function GET() {
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

  const users = await query(
    "SELECT * FROM users ORDER BY created_at DESC"
  );

  return NextResponse.json(users);
}
