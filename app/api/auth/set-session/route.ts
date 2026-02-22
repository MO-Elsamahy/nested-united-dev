import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const access_token = body?.access_token as string | undefined;
  const refresh_token = body?.refresh_token as string | undefined;

  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { ok: false, error: "Missing access_token/refresh_token" },
      { status: 400 }
    );
  }

  let response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.json({ ok: true });
          cookiesToSet.forEach(({ name, value, options }) => {
            // Let Supabase handle cookie options - don't override
            response.cookies.set(name, value, {
              ...options,
              path: '/',
            });
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    console.log('[set-session] Error:', error.message);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 401 }
    );
  }

  return response;
}
