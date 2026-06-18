import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import mysql from "mysql2/promise";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "غير مصرح" }, { status: 401 });
    }

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "rentals_dashboard",
    });

    const [accounts]: any = await conn.execute(
      "SELECT id, platform, account_name, last_poll_at, poll_error, is_active FROM browser_accounts WHERE platform IN ('airbnb', 'gathern')"
    );
    await conn.end();

    const statusMap: Record<string, any> = {};
    for (const acc of accounts) {
      statusMap[acc.id] = {
        platform: acc.platform,
        accountName: acc.account_name,
        lastPollAt: acc.last_poll_at,
        error: acc.poll_error,
        isActive: acc.is_active === 1
      };
    }

    return NextResponse.json({ success: true, data: statusMap });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
