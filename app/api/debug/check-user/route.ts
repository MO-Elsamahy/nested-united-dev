import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
        return NextResponse.json({ error: "Email required" });
    }

    try {
        const users = await query("SELECT id, email, role, is_active, password_hash FROM users WHERE email = ?", [email]);
        return NextResponse.json({
            user_found: users.length > 0,
            user: users[0] || null
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' });
    }
}
