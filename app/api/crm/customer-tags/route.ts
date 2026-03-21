import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";

// GET: Get customer tags
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customer_id");

        if (!customerId) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        }

        const tags = await query(`
            SELECT t.* FROM crm_tags t
            INNER JOIN crm_customer_tags ct ON t.id = ct.tag_id
            WHERE ct.customer_id = ?
        `, [customerId]);

        return NextResponse.json(tags);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Assign tag to customer
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { customer_id, tag_id } = body;

        if (!customer_id || !tag_id) {
            return NextResponse.json({ error: "customer_id and tag_id required" }, { status: 400 });
        }

        await execute(
            "INSERT IGNORE INTO crm_customer_tags (customer_id, tag_id) VALUES (?, ?)",
            [customer_id, tag_id]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Remove tag from customer
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get("customer_id");
        const tagId = searchParams.get("tag_id");

        if (!customerId || !tagId) {
            return NextResponse.json({ error: "customer_id and tag_id required" }, { status: 400 });
        }

        await execute(
            "DELETE FROM crm_customer_tags WHERE customer_id = ? AND tag_id = ?",
            [customerId, tagId]
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
