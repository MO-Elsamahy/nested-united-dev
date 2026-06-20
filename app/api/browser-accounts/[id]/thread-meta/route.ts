import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const threadId = url.searchParams.get("threadId");

  if (!threadId) {
    return NextResponse.json({ error: "Missing threadId" }, { status: 400 });
  }

  try {
    const row = await queryOne<{ unit_id: number | null; chalet_id: number | null }>(
      `SELECT unit_id, chalet_id FROM platform_thread_metadata
       WHERE browser_account_id = ? AND thread_id = ? LIMIT 1`,
      [id, threadId]
    );

    if (row && (row.unit_id || row.chalet_id)) {
      return NextResponse.json({ unit_id: row.unit_id, chalet_id: row.chalet_id || row.unit_id });
    }
    return NextResponse.json({ unit_id: null, chalet_id: null });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server Error" }, { status: 500 });
  }
}
