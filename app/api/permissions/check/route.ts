import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkUserPermission } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(request.url);
  const pagePath = searchParams.get("page_path");
  const action = searchParams.get("action") as "view" | "edit" | null;

  if (!pagePath || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (!session?.user?.id) {
    return NextResponse.json({ hasPermission: false }, { status: 401 });
  }

  const hasPermission = await checkUserPermission(session.user.id, pagePath, action);
  return NextResponse.json({ hasPermission });
}
