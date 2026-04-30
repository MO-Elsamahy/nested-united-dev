import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Helper to build a safe absolute URL for redirects
function safeRedirectUrl(path: string, req: NextRequest): URL {
    try {
        const reqUrl = new URL(req.url);
        // Replace 0.0.0.0 with localhost to avoid browser errors
        if (reqUrl.hostname === "0.0.0.0") {
            reqUrl.hostname = "localhost";
        }
        return new URL(path, reqUrl);
    } catch {
        return new URL(`http://localhost:3000${path}`);
    }
}

export async function GET(req: NextRequest) {
    try {
        const settings = await query<{ logo_url: string | null }>("SELECT logo_url FROM company_settings LIMIT 1");
        const logoUrl = settings?.[0]?.logo_url;

        if (!logoUrl || typeof logoUrl !== "string" || !logoUrl.startsWith("data:image")) {
            // Fallback to default static logo if not customized
            return NextResponse.redirect(safeRedirectUrl("/logo.png", req));
        }

        // Extract base64 image data
        const matches = logoUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return NextResponse.redirect(safeRedirectUrl("/logo.png", req));
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, "base64");

        // Return the binary image as a fast stream with moderate caching (1 hour)
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=60, stale-while-revalidate=3600",
            },
        });
    } catch (error) {
        console.error("Error serving company logo:", error);
        return NextResponse.redirect(safeRedirectUrl("/logo.png", req));
    }
}
