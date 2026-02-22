
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { customer_id, deal_id, type, title, description } = body;

        // Validation
        if (!customer_id || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const id = uuidv4();

        await execute(`
            INSERT INTO crm_activities (id, customer_id, deal_id, type, title, description, performed_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, customer_id, deal_id || null, type, title, description, session.user.id]);

        return NextResponse.json({ success: true, id });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
