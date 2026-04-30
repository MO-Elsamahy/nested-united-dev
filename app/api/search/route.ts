import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const like = `%${q}%`;

    interface SearchResult {
        id: string;
        name: string;
        type: 'customer' | 'employee' | 'deal';
        subtitle?: string;
        phone?: string;
    }

    const [customers, employees, deals] = await Promise.all([
        query<SearchResult>(
            `SELECT id, full_name as name, phone, 'customer' as type
             FROM customers WHERE status != 'archived'
               AND (full_name LIKE ? OR phone LIKE ?)
             LIMIT 5`,
            [like, like]
        ),
        query<SearchResult>(
            `SELECT id, full_name as name, job_title as subtitle, 'employee' as type
             FROM hr_employees WHERE status = 'active'
               AND full_name LIKE ?
             LIMIT 4`,
            [like]
        ),
        query<SearchResult>(
            `SELECT d.id, d.title as name, c.full_name as subtitle, 'deal' as type
             FROM crm_deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.status = 'open' AND d.title LIKE ?
             LIMIT 3`,
            [like]
        ),
    ]);

    return NextResponse.json({
        results: [...customers, ...employees, ...deals],
    });
}
