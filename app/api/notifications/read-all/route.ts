import { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
  }

  try {
    // CRITICAL: Scope to this user's notifications only
    await execute(
      "UPDATE notifications SET is_read = 1 WHERE recipient_user_id = ? AND is_read = 0",
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
  }
}
