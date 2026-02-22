import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const hasSupabaseUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    let usersRow: any = null;
    let usersRowError: any = null;

    if (user?.id) {
      const { data, error } = await supabase
        .from("users")
        .select("id,email,role,is_active")
        .eq("id", user.id)
        .maybeSingle();

      usersRow = data;
      usersRowError = error;
    }

    return NextResponse.json({
      ok: true,
      env: { hasSupabaseUrl, hasAnonKey },
      auth: {
        hasUser: Boolean(user),
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        userError: userError
          ? { message: userError.message, name: userError.name }
          : null,
      },
      usersTable: {
        row: usersRow,
        error: usersRowError
          ? { message: usersRowError.message, code: usersRowError.code }
          : null,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        env: { hasSupabaseUrl, hasAnonKey },
        error: { message: String(e?.message ?? e) },
      },
      { status: 500 }
    );
  }
}

