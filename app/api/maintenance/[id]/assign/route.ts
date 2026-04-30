import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { queryOne, execute, generateUUID } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only admins can assign
  if (user.role !== "admin" && user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { worker_id } = body;

  if (!worker_id) {
    return NextResponse.json({ error: "Worker ID required" }, { status: 400 });
  }

  try {
    // Verify the worker exists and is a maintenance_worker
    const worker = await queryOne<{ id: string; role: string }>(
      "SELECT id, role FROM users WHERE id = ? AND role = 'maintenance_worker' AND is_active = 1",
      [worker_id]
    );

    if (!worker) {
      return NextResponse.json({ error: "Invalid worker" }, { status: 400 });
    }

    // Get ticket info
    const ticket = await queryOne<{ title: string; unit_id: string }>(
      "SELECT title, unit_id FROM maintenance_tickets WHERE id = ?",
      [id]
    );

    // Get unit name
    let unitName = "غير محدد";
    if (ticket?.unit_id) {
      const unit = await queryOne<{ unit_name: string }>(
        "SELECT unit_name FROM units WHERE id = ?",
        [ticket.unit_id]
      );
      if (unit) unitName = unit.unit_name;
    }

    // Assign the ticket
    await execute(
      "UPDATE maintenance_tickets SET assigned_to = ?, accepted_at = NULL WHERE id = ?",
      [worker_id, id]
    );

    // Create notification for the assigned worker
    if (ticket) {
      await execute(
        `INSERT INTO notifications (id, type, unit_id, maintenance_ticket_id, title, body, audience, recipient_user_id, is_read)
         VALUES (?, 'maintenance_created', ?, ?, ?, ?, 'all_users', ?, 0)`,
        [
          generateUUID(),
          ticket.unit_id,
          id,
          "تذكرة صيانة جديدة لك",
          `تم تعيين تذكرة صيانة للوحدة: ${unitName} إليك`,
          worker_id,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
  }
}
