import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

import { queryOne } from "@/lib/db";
import { Employee } from "@/lib/types/hr";

// GET: الحصول على ملف الموظف للمستخدم الحالي
export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    try {
        const employee = await queryOne<Employee>(
            `SELECT * FROM hr_employees WHERE user_id = ? AND status = 'active'`,
            [user.id]
        );

        if (!employee) {
            return NextResponse.json({ error: "لا يوجد ملف موظف" }, { status: 404 });
        }

        return NextResponse.json(employee);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}
