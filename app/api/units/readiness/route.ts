import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/units/readiness - Get all units with their readiness status
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const units = await query(
      `SELECT u.*, 
              pa.id as pa_id, pa.platform as pa_platform, pa.account_name as pa_account_name
       FROM units u
       LEFT JOIN platform_accounts pa ON u.platform_account_id = pa.id
       WHERE u.status = 'active'
       ORDER BY u.unit_name`
    );

    // Transform to match expected format
    let filteredUnits = (units as any[]).map((u) => ({
      ...u,
      platform_account: u.pa_id
        ? { id: u.pa_id, platform: u.pa_platform, account_name: u.pa_account_name }
        : null,
      readiness: {
        status: u.readiness_status,
        checkout_date: u.readiness_checkout_date,
        checkin_date: u.readiness_checkin_date,
        guest_name: u.readiness_guest_name,
        notes: u.readiness_notes,
      },
    }));

    // Filter by status if provided
    if (statusFilter) {
      filteredUnits = filteredUnits.filter(
        (unit) => unit.readiness?.status === statusFilter
      );
    }

    return NextResponse.json(filteredUnits);
  } catch (error: any) {
    console.error("Error in GET /api/units/readiness:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
