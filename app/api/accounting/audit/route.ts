import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AccountingAuditLog } from "@/lib/types/accounting";

export async function GET(_request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const logs = await query<AccountingAuditLog>(`
      SELECT 
        l.id, l.action, l.entity_type, l.entity_id, l.details, l.created_at,
        u.name as user_name
      FROM accounting_audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `);

        return NextResponse.json(logs);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
