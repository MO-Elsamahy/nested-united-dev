import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne, execute, generateUUID } from "@/lib/db";

// Get activity logs (super admin only)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUser = await queryOne<{ role: string }>(
    "SELECT role FROM users WHERE id = ?",
    [session.user.id]
  );

  const isSuperAdmin = currentUser?.role === "super_admin";

  const { searchParams } = new URL(request.url);
  // Non-super-admins can only see their own logs
  let userId = searchParams.get("user_id");
  if (!isSuperAdmin) {
    userId = session.user.id;
  }
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;
  const fromDate = searchParams.get("from_date");

  try {
    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];

    // Default: last 30 days
    if (fromDate) {
      conditions.push("ual.created_at >= ?");
      params.push(fromDate);
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      conditions.push("ual.created_at >= ?");
      params.push(thirtyDaysAgo.toISOString().slice(0, 19).replace("T", " "));
    }

    if (userId) {
      conditions.push("ual.user_id = ?");
      params.push(userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM user_activity_logs ual ${whereClause}`,
      params
    );
    const total = countResult?.count || 0;

    // Get logs with user info
    const logs = await query(
      `SELECT ual.*, u.id as user_id, u.name as user_name, u.email as user_email
       FROM user_activity_logs ual
       LEFT JOIN users u ON ual.user_id = u.id
       ${whereClause}
       ORDER BY ual.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Transform to match expected format
    const transformedLogs = (logs as any[]).map((log) => ({
      ...log,
      user: log.user_id ? { id: log.user_id, name: log.user_name, email: log.user_email } : null,
    }));

    return NextResponse.json({
      logs: transformedLogs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create activity log
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    action_type,
    page_path,
    resource_type,
    resource_id,
    description,
    metadata,
  } = body;

  // Get IP and user agent from headers
  const ipAddress = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    await execute(
      `INSERT INTO user_activity_logs 
       (id, user_id, action_type, page_path, resource_type, resource_id, description, metadata, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generateUUID(),
        session.user.id,
        action_type,
        page_path || null,
        resource_type || null,
        resource_id || null,
        description || null,
        metadata ? JSON.stringify(metadata) : null,
        ipAddress,
        userAgent,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
