import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";

// GET: كل الإعدادات
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const settings = await query("SELECT * FROM hr_settings");

        // Convert array to object for easier frontend consumption
        const settingsMap: Record<string, string> = {};
        if (settings) {
            // @ts-ignore
            settings.forEach((s: any) => {
                settingsMap[s.setting_key] = s.setting_value;
            });
        }

        return NextResponse.json(settingsMap);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: تحديث الإعدادات
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const settings = body; // Object { key: value }

        // Upsert each setting
        for (const [key, value] of Object.entries(settings)) {
            await execute(
                `INSERT INTO hr_settings (setting_key, setting_value, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
                [key, String(value)]
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update settings error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
