import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

import { checkUserPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const pagePath = searchParams.get("page_path");
  const action = searchParams.get("action") as "view" | "edit" | null;

  if (!pagePath || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!user?.id) {
    return NextResponse.json({ hasPermission: false }, { status: 401 });
  }

  const hasPermission = await checkUserPermission(user.id, pagePath, action);
  return NextResponse.json({ hasPermission });
}
