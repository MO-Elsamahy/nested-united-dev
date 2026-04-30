import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne, execute } from "@/lib/db";
import { MaintenanceTicket } from "@/lib/types/maintenance";

// GET single maintenance ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await execute("DELETE FROM maintenance_tickets WHERE id = ?", [id]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
