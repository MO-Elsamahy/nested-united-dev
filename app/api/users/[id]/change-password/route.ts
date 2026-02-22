import { NextResponse } from "next/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { execute } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser || !isSuperAdmin(currentUser)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { new_password } = body;

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(new_password, 10);

    // Update password in database
    await execute(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [password_hash, id]
    );

    return NextResponse.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error: any) {
    console.error("Error in change password:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ أثناء تغيير كلمة المرور" },
      { status: 500 }
    );
  }
}
