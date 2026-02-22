
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, execute } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

// GET: List Customers
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");
        const type = searchParams.get("type");

        let sql = `
            SELECT * FROM customers 
            WHERE status != 'archived'
        `;
        const params: any[] = [];

        if (search) {
            sql += ` AND (full_name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (type) {
            sql += ` AND type = ?`;
            params.push(type);
        }

        sql += ` ORDER BY created_at DESC LIMIT 50`;

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
