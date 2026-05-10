import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { generateUUID } from "@/lib/db";
import { existsSync } from "fs";
import { getCurrentUser } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"];

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ error: "لم يتم رفع أي ملف" }, { status: 400 });
        }

        // 1. Check file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "الملف كبير جداً (الحد الأقصى 10 ميجابايت)" }, { status: 400 });
        }

        // 2. Check file extension
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            return NextResponse.json({ error: "نوع الملف غير مسموح به" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 3. Create unique name
        const filename = `${generateUUID()}.${ext}`;

        // 4. Ensure upload directory exists
        const uploadDir = join(process.cwd(), "public", "uploads");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const path = join(uploadDir, filename);

        // 5. Write file
        await writeFile(path, buffer);

        // Return public URL
        return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (error: unknown) {
        console.error("Upload error:", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "فشل رفع الملف" }, { status: 500 });
    }
}
