import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne, execute, generateUUID } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user || user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, name, role } = body;

  if (!email || !password || !name || !role) {
    return NextResponse.json({ error: "يرجى تعبئة جميع الحقول المطلوبة" }, { status: 400 });
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

    // Auto-create role_system_permissions if this role doesn't have entries yet
    const SYSTEMS = ["rentals", "maintenance", "accounting", "hr", "crm"];
    // Default grants for each role (conservative — admin can customize later)
    const ROLE_DEFAULTS: Record<string, string[]> = {
      admin:              ["rentals", "crm"],
      accountant:         ["accounting"],
      hr_manager:         ["hr"],
      maintenance_worker: ["maintenance", "rentals"],
      employee:           [],
    };
    
    const defaultSystems = ROLE_DEFAULTS[role] || [];
    
    // Check if this role already has permission entries
    const existingPerm = await queryOne<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM role_system_permissions WHERE role = ?",
      [role]
    );
    
    // Only seed if no entries exist for this role yet
    if (!existingPerm || existingPerm.cnt === 0) {
      for (const sys of SYSTEMS) {
        await execute(
          `INSERT INTO role_system_permissions (id, role, system_id, can_access)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE id = id`,
          [generateUUID(), role, sys, defaultSystems.includes(sys) ? 1 : 0]
        );
      }
    }

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
