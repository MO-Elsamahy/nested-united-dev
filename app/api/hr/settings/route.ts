import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute, queryOne, generateUUID } from "@/lib/db";
import { hrSettingsRowsToMap } from "@/lib/hr-settings";

// GET: كل الإعدادات (أحدث قيمة لكل مفتاح عند وجود صفوف مكررة)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const rows = await query<any>(`SELECT * FROM hr_settings ORDER BY updated_at DESC`);
        return NextResponse.json(hrSettingsRowsToMap(rows));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: تحديث الإعدادات (تحديث حسب المفتاح أو إدراج صف جديد — لا يعتمد على UNIQUE)
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const skipKeys = new Set(["error", "success"]);

        for (const [key, value] of Object.entries(body)) {
            if (skipKeys.has(key)) continue;
            if (typeof value === "object" && value !== null && !Array.isArray(value)) continue;

            const strVal = value === null || value === undefined ? "" : String(value);

            const existing = await queryOne<{ id: string }>(
                "SELECT id FROM hr_settings WHERE setting_key = ? LIMIT 1",
                [key]
            );
            if (existing) {
                await execute(
                    `UPDATE hr_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?`,
                    [strVal, key]
                );
            } else {
                await execute(
                    `INSERT INTO hr_settings (id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, NOW())`,
                    [generateUUID(), key, strVal]
                );
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update settings error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
