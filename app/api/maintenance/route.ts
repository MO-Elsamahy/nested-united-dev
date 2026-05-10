import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { MaintenanceTicket } from "@/lib/types/maintenance";
import { hasSystemAccess } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth";

// GET all maintenance tickets
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  const hasAccess = await hasSystemAccess(user.role, "maintenance");
  if (!hasAccess) {
    return NextResponse.json({ error: "عذراً، لا تملك صلاحية الوصول لنظام الصيانة" }, { status: 403 });
  }

  try {
    // Get tickets with unit and creator info
    const tickets = await query<MaintenanceTicket>(
      `SELECT mt.*, 
              u.unit_name, 
              creator.name as created_by_name
       FROM maintenance_tickets mt
       LEFT JOIN units u ON mt.unit_id = u.id
       LEFT JOIN users creator ON mt.created_by = creator.id
       ORDER BY mt.created_at DESC`
    );

    // Transform to match expected format
    const transformed = tickets.map((t) => ({
      ...t,
      unit: { unit_name: t.unit_name || "" },
      created_by_user: { name: t.created_by_name || "" },
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}

// POST create new maintenance ticket
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  const hasAccess = await hasSystemAccess(user.role, "maintenance");
  if (!hasAccess) {
    return NextResponse.json({ error: "عذراً، لا تملك صلاحية إنشاء تذاكر الصيانة. يرجى مراجعة مدير النظام." }, { status: 403 });
  }

  const body = await request.json();
  const { unit_id, title, description, priority } = body;

  if (!unit_id || !title) {
    return NextResponse.json({ error: "يرجى تعبئة جميع الحقول المطلوبة" }, { status: 400 });
  }

  // Get unit name for notification
  const unit = await queryOne<{ unit_name: string }>(
    "SELECT unit_name FROM units WHERE id = ?",
    [unit_id]
  );

  const ticketId = generateUUID();

  try {
    // Create ticket
    await execute(
      `INSERT INTO maintenance_tickets (id, unit_id, title, description, priority, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [ticketId, unit_id, title, description || null, priority || null, user.id]
    );

    const ticket = await queryOne(
      "SELECT * FROM maintenance_tickets WHERE id = ?",
      [ticketId]
    );

    // Get all active maintenance workers
    const workers = await query<{ id: string }>(
      "SELECT id FROM users WHERE role = 'maintenance_worker' AND is_active = 1"
    );

    // Create notifications for all maintenance workers
    if (workers.length > 0) {
      for (const worker of workers) {
        await execute(
          `INSERT INTO notifications (id, type, unit_id, maintenance_ticket_id, title, body, audience, recipient_user_id, is_read)
           VALUES (?, 'maintenance_created', ?, ?, ?, ?, 'all_users', ?, 0)`,
          [
            generateUUID(),
            unit_id,
            ticketId,
            "تذكرة صيانة جديدة لك",
            `تم إنشاء تذكرة صيانة جديدة: ${title} - الوحدة: ${unit?.unit_name || "غير محدد"}. يمكنك قبولها من صفحة الصيانة.`,
            worker.id,
          ]
        );
      }
    }

    // Also create notification for all admins (but only if they're not the creator)
    const admins = await query<{ id: string }>(
      "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1 AND id != ?",
      [user.id]
    );

    if (admins.length > 0) {
      for (const admin of admins) {
        await execute(
          `INSERT INTO notifications (id, type, unit_id, maintenance_ticket_id, title, body, audience, recipient_user_id, is_read)
           VALUES (?, 'maintenance_created', ?, ?, ?, ?, 'all_admins', ?, 0)`,
          [
            generateUUID(),
            unit_id,
            ticketId,
            "تذكرة صيانة جديدة",
            `تم إنشاء تذكرة صيانة جديدة: ${title} - الوحدة: ${unit?.unit_name || "غير محدد"}`,
            admin.id,
          ]
        );
      }
    }

    return NextResponse.json(ticket, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
