import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { generateUUID } from "@/lib/db";

// Handle file upload
export async function POST(request: Request) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique name
        const ext = file.name.split(".").pop();
        const filename = `${generateUUID()}.${ext}`;

        // Save to public/uploads (ensure folder exists manually or via script if needed)
        // In production, we'd check if dir exists. For now, assuming standard setup.
        const uploadDir = join(process.cwd(), "public", "uploads");
        const path = join(uploadDir, filename);

        // Write file
        await writeFile(path, buffer);

        // Return public URL
        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
