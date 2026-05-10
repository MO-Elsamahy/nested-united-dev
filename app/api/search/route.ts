import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { query } from "@/lib/db";
import { hasSystemAccess } from "@/lib/permissions";

export async function GET(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "يرجى تسجيل الدخول أولاً" }, { status: 401 });

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

    // Check permissions for different systems
    const [hasHrAccess, hasCrmAccess] = await Promise.all([
        hasSystemAccess(user.role, "hr"),
        hasSystemAccess(user.role, "crm")
    ]);

    const searchPromises = [];

    // 1. CRM Customers
    if (hasCrmAccess) {
        searchPromises.push(query<SearchResult>(
            `SELECT id, full_name as name, phone, 'customer' as type
             FROM customers WHERE status != 'archived'
               AND (full_name LIKE ? OR phone LIKE ?)
             LIMIT 5`,
            [like, like]
        ));
    } else {
        searchPromises.push(Promise.resolve([]));
    }

    // 2. HR Employees
    if (hasHrAccess) {
        searchPromises.push(query<SearchResult>(
            `SELECT id, full_name as name, job_title as subtitle, 'employee' as type
             FROM hr_employees WHERE status = 'active'
               AND full_name LIKE ?
             LIMIT 4`,
            [like]
        ));
    } else {
        searchPromises.push(Promise.resolve([]));
    }

    // 3. CRM Deals
    if (hasCrmAccess) {
        searchPromises.push(query<SearchResult>(
            `SELECT d.id, d.title as name, c.full_name as subtitle, 'deal' as type
             FROM crm_deals d
             LEFT JOIN customers c ON d.customer_id = c.id
             WHERE d.status = 'open' AND d.title LIKE ?
             LIMIT 3`,
            [like]
        ));
    } else {
        searchPromises.push(Promise.resolve([]));
    }

    const [customers, employees, deals] = await Promise.all(searchPromises);

    return NextResponse.json({
        results: [...(customers || []), ...(employees || []), ...(deals || [])],
    });
}
