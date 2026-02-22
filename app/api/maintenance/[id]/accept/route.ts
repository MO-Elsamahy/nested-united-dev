import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne, query, execute, generateUUID } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user is a maintenance worker
  if (user.role !== "maintenance_worker") {
    return NextResponse.json({ error: "Only maintenance workers can accept tickets" }, { status: 403 });
  }

  try {
    // Get the ticket
    const ticket = await queryOne<{
      assigned_to: string | null;
      accepted_at: string | null;
      status: string;
      title: string;
      unit_id: string;
    }>(
      "SELECT assigned_to, accepted_at, status, title, unit_id FROM maintenance_tickets WHERE id = ?",
      [id]
    );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Ticket must be open
    if (ticket.status !== "open") {
      return NextResponse.json({ error: "Only open tickets can be accepted" }, { status: 400 });
    }

    // If ticket is already accepted by someone else, reject
    if (ticket.accepted_at) {
      return NextResponse.json({ error: "تم قبول هذه التذكرة بالفعل من قبل عامل آخر" }, { status: 400 });
    }

    // If ticket is assigned to someone else, reject
    if (ticket.assigned_to && ticket.assigned_to !== user.id) {
      return NextResponse.json({ error: "هذه التذكرة معينة لعامل آخر" }, { status: 403 });
    }

    // Accept the ticket - only if not already accepted
    const result = await execute(
      `UPDATE maintenance_tickets 
       SET assigned_to = ?, accepted_at = NOW(), status = 'in_progress'
       WHERE id = ? AND accepted_at IS NULL`,
      [user.id, id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json({ error: "تم قبول هذه التذكرة بالفعل من قبل عامل آخر" }, { status: 400 });
    }

    // Get unit name for notification
    let unitName = "غير محدد";
    if (ticket.unit_id) {
      const unit = await queryOne<{ unit_name: string }>(
        "SELECT unit_name FROM units WHERE id = ?",
        [ticket.unit_id]
      );
      if (unit) unitName = unit.unit_name;
    }

    // Get user name
    const userInfo = await queryOne<{ name: string }>(
      "SELECT name FROM users WHERE id = ?",
      [user.id]
    );

    // Create notification for admins
    const admins = await query<{ id: string }>(
      "SELECT id FROM users WHERE role IN ('admin', 'super_admin') AND is_active = 1"
    );

    for (const admin of admins) {
      await execute(
        `INSERT INTO notifications (id, type, unit_id, maintenance_ticket_id, title, body, audience, recipient_user_id, is_read)
         VALUES (?, 'maintenance_status_changed', ?, ?, ?, ?, 'all_admins', ?, 0)`,
        [
          generateUUID(),
          ticket.unit_id,
          id,
          "تم قبول تذكرة صيانة",
          `تم قبول تذكرة الصيانة "${ticket.title}" من قبل ${userInfo?.name || "عامل صيانة"} - الوحدة: ${unitName}`,
          admin.id,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
