import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const settings: any = await query("SELECT logo_url FROM company_settings LIMIT 1");
        const logoUrl = settings?.[0]?.logo_url;

        if (!logoUrl || typeof logoUrl !== "string" || !logoUrl.startsWith("data:image")) {
            // Fallback to default static logo if not customized
            return NextResponse.redirect(new URL("/logo.png", req.url));
        }

        // Extract base64 image data
        const matches = logoUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return NextResponse.redirect(new URL("/logo.png", req.url));
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        // Return the binary image as a fast stream with moderate caching (1 hour)
        // using revalidation to ensure uploads appear somewhat quickly
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
            },
        });
    } catch (error) {
        console.error("Error serving company logo:", error);
        return NextResponse.redirect(new URL("/logo.png", req.url));
    }
}
