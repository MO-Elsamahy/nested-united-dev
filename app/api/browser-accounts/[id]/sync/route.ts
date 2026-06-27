import { NextRequest, NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { cookies_json, platform_user_id, auth_token, chat_auth_token, airbnb_inbox_hash, airbnb_thread_hash } = body;

    const account = await queryOne("SELECT id FROM browser_accounts WHERE id = ?", [id]);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const updates = [];
    const values = [];

    if (cookies_json !== undefined) {
      updates.push("cookies_json = ?");
      values.push(cookies_json);
    }
    if (platform_user_id !== undefined && platform_user_id !== null) {
      updates.push("platform_user_id = COALESCE(?, platform_user_id)");
      values.push(platform_user_id);
    } else if (platform_user_id === null) {
      // ignore if null
    }
    if (auth_token !== undefined) {
      updates.push("auth_token = ?");
      values.push(auth_token);
    }
    if (chat_auth_token !== undefined) {
      updates.push("chat_auth_token = ?");
      values.push(chat_auth_token);
    }
    if (airbnb_inbox_hash !== undefined) {
      updates.push("airbnb_inbox_hash = ?");
      values.push(airbnb_inbox_hash);
    }
    if (airbnb_thread_hash !== undefined) {
      updates.push("airbnb_thread_hash = ?");
      values.push(airbnb_thread_hash);
    }

    updates.push("last_connected_at = NOW()");
    
    if (updates.length > 0) {
      values.push(id);
      await execute(`UPDATE browser_accounts SET ${updates.join(', ')} WHERE id = ?`, values);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server Error" }, { status: 500 });
  }
}
