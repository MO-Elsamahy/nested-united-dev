import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute, generateUUID } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
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
  const { email, password, name, role } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if email already exists
  const existingUser = await queryOne(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );

  if (existingUser) {
    return NextResponse.json({ error: "الإيميل موجود بالفعل" }, { status: 400 });
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 10);
  const userId = generateUUID();

  try {
    await execute(
      `INSERT INTO users (id, email, password_hash, name, role, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, email, password_hash, name, role, 1]
    );

    // Auto-create HR Employee Record
    const employeeId = generateUUID();
    await execute(
      `INSERT INTO hr_employees (
        id, user_id, full_name, email, 
        department, job_title, status, 
        hire_date, basic_salary, housing_allowance, transport_allowance
      ) VALUES (?, ?, ?, ?, 'General', ?, 'active', CURDATE(), 4000, 1000, 500)`,
      [employeeId, userId, name, email, role]
    );

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
