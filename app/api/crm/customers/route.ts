
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET: List Customers (filters: search, type, active_deals, deals_total bucket, tag_id)
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const type = searchParams.get("type");
        const activeDeals = searchParams.get("active_deals"); // 'yes' | 'no'
        const dealsTotal = searchParams.get("deals_total"); // '0' | '1' | '2-4' | '5+'
        const tagId = searchParams.get("tag_id");

        const totalDealsSub = `(SELECT COUNT(*) FROM crm_deals d WHERE d.customer_id = c.id)`;
        const openDealsSub = `(SELECT COUNT(*) FROM crm_deals d WHERE d.customer_id = c.id AND d.status = 'open')`;
        const tagLabelsSub = `(SELECT GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR '، ')
            FROM crm_customer_tags ct
            INNER JOIN crm_tags t ON t.id = ct.tag_id
            WHERE ct.customer_id = c.id)`;

        let sql = `
            SELECT c.*,
                   ${totalDealsSub} AS total_deal_count,
                   ${openDealsSub} AS open_deal_count,
                   ${tagLabelsSub} AS tag_labels
            FROM customers c
            WHERE c.status != 'archived'
        `;
        const params: unknown[] = [];

        if (search) {
            sql += ` AND (c.full_name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (type) {
            sql += ` AND c.type = ?`;
            params.push(type);
        }

        if (activeDeals === "yes") {
            sql += ` AND ${openDealsSub} > 0`;
        } else if (activeDeals === "no") {
            sql += ` AND ${openDealsSub} = 0`;
        }

        if (dealsTotal === "0") {
            sql += ` AND ${totalDealsSub} = 0`;
        } else if (dealsTotal === "1") {
            sql += ` AND ${totalDealsSub} = 1`;
        } else if (dealsTotal === "2-4") {
            sql += ` AND ${totalDealsSub} BETWEEN 2 AND 4`;
        } else if (dealsTotal === "5+") {
            sql += ` AND ${totalDealsSub} >= 5`;
        }

        if (tagId && /^[0-9a-f-]{36}$/i.test(tagId)) {
            sql += ` AND EXISTS (
                SELECT 1 FROM crm_customer_tags ct
                WHERE ct.customer_id = c.id AND ct.tag_id = ?
            )`;
            params.push(tagId);
        }

        sql += ` ORDER BY c.created_at DESC LIMIT 100`;

        const customers = await query(sql, params);
        return NextResponse.json(customers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create Customer
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { full_name, phone, email, national_id, address, type, notes } = body;

        // 1. Validate Required Fields
        if (!full_name) {
            return NextResponse.json({ error: "Client name is required" }, { status: 400 });
        }

        // 2. Duplicate Check (by Phone)
        if (phone) {
            // Check for duplicate phone
            const existing = await query<any[]>(
                "SELECT id, full_name, phone FROM customers WHERE phone = ?",
                [phone]
            );

            if (existing && existing.length > 0) {
                return NextResponse.json({
                    error: "Duplicate Customer",
                    details: existing[0]
                }, { status: 409 });
            }

            // Note: In the new schema we agreed on 'phone', but let's handle potential schema drift safely
            // For now, I'll stick to 'phone' as per the latest script.

        }

        const id = uuidv4();

        await execute(`
            INSERT INTO customers (id, full_name, phone, email, national_id, address, type, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, full_name, phone, email, national_id, address, type || 'individual', notes]);

        return NextResponse.json({ success: true, id });

    } catch (error: any) {
        // Handle unique constraint error specifically
        if (error.code === 'ER_DUP_ENTRY') {
            return NextResponse.json({ error: "Duplicate Entry: Phone number already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
