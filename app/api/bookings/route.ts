import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne, execute, generateUUID } from "@/lib/db";
import { checkUserPermission, logActivityInServer } from "@/lib/permissions";

interface BookingRow {
  id: string;
  unit_id: string;
  platform_account_id: string | null;
  platform: string | null;
  guest_name: string;
  phone: string | null;
  checkin_date: string;
  checkout_date: string;
  amount: number | null;
  currency: string | null;
  notes: string | null;
  unit_name?: string;
  unit_code?: string;
}

// GET /api/bookings - list bookings with optional filters
export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const platformAccountIds = searchParams.getAll("platform_account_id");
  const unitId = searchParams.get("unit_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const exportCsv = searchParams.get("export") === "csv";
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  try {
    // Calendar view: year + month
    if (year && month) {
      const firstDay = new Date(Number(year), Number(month) - 1, 1).toISOString().split("T")[0];
      const lastDay = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];

      const bookings = await query<any>(
        `SELECT b.*, u.id as unit_id_ref, u.unit_name, u.unit_code 
         FROM bookings b 
         LEFT JOIN units u ON b.unit_id = u.id 
         WHERE (b.checkin_date <= ? AND b.checkout_date >= ?)
         ORDER BY b.checkin_date ASC`,
        [lastDay, firstDay]
      );

      const reservations = await query<any>(
        `SELECT r.*, u.id as unit_id_ref, u.unit_name, u.unit_code 
         FROM reservations r 
         LEFT JOIN units u ON r.unit_id = u.id 
         WHERE (r.start_date <= ? AND r.end_date >= ?)
         ORDER BY r.start_date ASC`,
        [lastDay, firstDay]
      );

      const allBookings = [
        ...(bookings || []).map((b: any) => ({
          id: b.id,
          type: "manual",
          guest_name: b.guest_name || "غير محدد",
          checkin_date: typeof b.checkin_date === 'string' ? b.checkin_date : new Date(b.checkin_date).toISOString().split('T')[0],
          checkout_date: typeof b.checkout_date === 'string' ? b.checkout_date : new Date(b.checkout_date).toISOString().split('T')[0],
          unit: { id: b.unit_id_ref, unit_name: b.unit_name, unit_code: b.unit_code },
          platform_account: null,
        })),
        ...(reservations || []).map((r: any) => ({
          id: r.id,
          type: "ical",
          guest_name: r.summary || "حجز من iCal",
          checkin_date: typeof r.start_date === 'string' ? r.start_date : new Date(r.start_date).toISOString().split('T')[0],
          checkout_date: typeof r.end_date === 'string' ? r.end_date : new Date(r.end_date).toISOString().split('T')[0],
          unit: { id: r.unit_id_ref, unit_name: r.unit_name, unit_code: r.unit_code },
          platform_account: null,
        })),
      ];

      return NextResponse.json(allBookings);
    }

    // Build WHERE clause for bookings
    const conditions: string[] = [];
    const params: any[] = [];

    if (platformAccountIds.length > 0) {
      conditions.push(`b.platform_account_id IN (${platformAccountIds.map(() => "?").join(",")})`);
      params.push(...platformAccountIds);
    }
    if (unitId) {
      conditions.push("b.unit_id = ?");
      params.push(unitId);
    }
    if (from) {
      conditions.push("b.checkin_date >= ?");
      params.push(from);
    }
    if (to) {
      conditions.push("b.checkout_date <= ?");
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get bookings
    const bookingsRows = await query<BookingRow>(
      `SELECT b.*, u.unit_name, u.unit_code
       FROM bookings b
       LEFT JOIN units u ON b.unit_id = u.id
       ${whereClause}
       ORDER BY b.checkin_date DESC`,
      params
    );

    // Transform bookings
    const bookings = bookingsRows.map((b) => ({
      ...b,
      unit: { id: b.unit_id, unit_name: b.unit_name, unit_code: b.unit_code },
    }));

    // Get reservations (iCal)
    const reservationsRows = await query(
      `SELECT r.*, u.id as unit_id, u.unit_name, u.unit_code, u.platform_account_id as unit_platform_account_id
       FROM reservations r
       LEFT JOIN units u ON r.unit_id = u.id
       ORDER BY r.start_date DESC`
    );

    // Transform reservations to look like bookings
    const reservations = (reservationsRows as any[]).map((r) => ({
      guest_name: r.summary || "حجز iCal",
      phone: null,
      checkin_date: r.start_date,
      checkout_date: r.end_date,
      unit: { id: r.unit_id, unit_name: r.unit_name, unit_code: r.unit_code },
      platform: r.platform || "ical",
      platform_account_id: r.unit_platform_account_id ?? null,
      amount: null,
      currency: null,
      notes: r.summary || "",
    }));

    let rows = [...bookings, ...reservations];

    // Filter by platform_account_id for reservations if needed
    if (platformAccountIds.length > 0) {
      rows = rows.filter((item: any) => {
        const itemAccountId = item.platform_account_id || item.unit?.platform_account_id;
        return itemAccountId && platformAccountIds.includes(itemAccountId);
      });
    }

    rows.sort(
      (a: any, b: any) =>
        new Date(b.checkin_date || b.start_date).getTime() -
        new Date(a.checkin_date || a.start_date).getTime()
    );

    if (!exportCsv) {
      return NextResponse.json(rows);
    }

    // CSV export
    const header = [
      "guest_name",
      "phone",
      "checkin_date",
      "checkout_date",
      "unit_name",
      "unit_code",
      "platform",
      "platform_account_id",
      "amount",
      "currency",
      "notes",
    ];

    const csvLines = [
      header.join(","),
      ...rows.map((b: any) =>
        [
          b.guest_name ?? "",
          b.phone ?? "",
          b.checkin_date ?? "",
          b.checkout_date ?? "",
          b.unit?.unit_name ?? "",
          b.unit?.unit_code ?? "",
          b.platform ?? "",
          b.platform_account_id ?? "",
          b.amount ?? 0,
          b.currency ?? "SAR",
          (b.notes ?? "").replace(/"/g, '""'),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    return new NextResponse(csvLines, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=bookings.csv",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/bookings - create booking
export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check permission
  const hasPermission = await checkUserPermission(currentUser.id, "/dashboard/bookings", "edit");
  if (!hasPermission) {
    return NextResponse.json({ error: "Forbidden: لا تملك صلاحية الإنشاء" }, { status: 403 });
  }

  const body = await request.json();
  const {
    unit_id,
    platform_account_id,
    platform,
    guest_name,
    phone,
    checkin_date,
    checkout_date,
    amount,
    currency,
    notes,
  } = body;

  if (!unit_id || !guest_name || !checkin_date || !checkout_date) {
    return NextResponse.json({ error: "الحقول الأساسية مطلوبة" }, { status: 400 });
  }

  const bookingId = generateUUID();

  try {
    await execute(
      `INSERT INTO bookings (id, unit_id, platform_account_id, platform, guest_name, phone, checkin_date, checkout_date, amount, currency, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookingId,
        unit_id,
        platform_account_id || null,
        platform || null,
        guest_name,
        phone || null,
        checkin_date,
        checkout_date,
        amount ?? 0,
        currency || "SAR",
        notes || null,
        currentUser.id,
      ]
    );

    const booking = await queryOne("SELECT * FROM bookings WHERE id = ?", [bookingId]);

    // Log activity
    await logActivityInServer({
      userId: currentUser.id,
      action_type: "create",
      page_path: "/dashboard/bookings",
      resource_type: "booking",
      resource_id: bookingId,
      description: `إنشاء حجز جديد: ${guest_name}`,
      metadata: { guest_name, unit_id, checkin_date, checkout_date },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
