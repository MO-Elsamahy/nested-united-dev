import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { MaintenanceTicket } from "@/lib/types/maintenance";
import { getCurrentUser, isAdmin } from "@/lib/auth";

// GET single maintenance ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const ticket = await queryOne<MaintenanceTicket>(
      `SELECT mt.*, u.unit_name, creator.name as created_by_name
       FROM maintenance_tickets mt
       LEFT JOIN units u ON mt.unit_id = u.id
       LEFT JOIN users creator ON mt.created_by = creator.id
       WHERE mt.id = ?`,
      [id]
    );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Transform to match expected format
    const transformed = {
      ...ticket,
      unit: { unit_name: ticket.unit_name || "" },
      created_by_user: { name: ticket.created_by_name || "" },
    };

    return NextResponse.json(transformed);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// PUT update maintenance ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, status, priority, worker_notes } = body;

  // Build update query dynamically
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (title !== undefined) {
    updates.push("title = ?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description = ?");
    values.push(description);
  }
  if (priority !== undefined) {
    updates.push("priority = ?");
    values.push(priority);
  }
  if (worker_notes !== undefined) {
    updates.push("worker_notes = ?");
    values.push(worker_notes);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    values.push(status);
    if (status === "resolved") {
      updates.push("resolved_at = NOW()");
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  values.push(id);

  try {
    await execute(
      `UPDATE maintenance_tickets SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const updatedTicket = await queryOne<MaintenanceTicket>(
      "SELECT * FROM maintenance_tickets WHERE id = ?",
      [id]
    );

    return NextResponse.json(updatedTicket);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE maintenance ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
  }

  try {
    await execute("DELETE FROM maintenance_tickets WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
