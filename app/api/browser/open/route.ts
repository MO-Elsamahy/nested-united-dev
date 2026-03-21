import { NextResponse } from "next/server";
import { BrowserManager } from "../../../../lib/browser-manager";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { accountId } = body;

        if (!accountId) {
            return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
        }

        // 1. Try to connect first (is it already open?)
        let browser = await BrowserManager.connectToBrowser(accountId);
        let message = "تم الاتصال بالمتصفح المفتوح مسبقاً";

        // 2. If not, launch a new one
        if (!browser) {
            console.log(`[API] Creating new browser instance for ${accountId}`);
            const result = await BrowserManager.launchBrowser(accountId);
            browser = result.browser;
            message = "تم فتح متصفح جديد بنجاح";
        } else {
            console.log(`[API] Reconnected to existing browser for ${accountId}`);
        }

        return NextResponse.json({
            success: true,
            message,
            status: "connected"
        });

    } catch (error: any) {
        console.error("[API] Error opening browser:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "فشل في فتح المتصفح"
        }, { status: 500 });
    }
}
