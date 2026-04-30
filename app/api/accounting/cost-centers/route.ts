import { NextResponse } from "next/server";
import { execute, query, generateUUID } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET() {
    const rows = await query("SELECT * FROM accounting_cost_centers WHERE deleted_at IS NULL ORDER BY code ASC");
    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const id = generateUUID();

        await execute(
            `INSERT INTO accounting_cost_centers (id, code, name, description) VALUES (?, ?, ?, ?)`,
            [id, body.code, body.name, body.description || null]
        );

        return NextResponse.json({ success: true, id });
    } catch (err: unknown) {
        return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    await execute("UPDATE accounting_cost_centers SET deleted_at = NOW() WHERE id = ?", [searchParams.get("id")]);
    return NextResponse.json({ success: true });
}
