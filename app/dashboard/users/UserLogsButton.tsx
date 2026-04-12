"use client";

import { History } from "lucide-react";
import Link from "next/link";

interface UserLogsButtonProps {
    userId: string;
}

export function UserLogsButton({ userId }: UserLogsButtonProps) {
    return (
        <Link
            href={`/dashboard/activity-logs?user_id=${userId}`}
            className="p-1 sm:p-2 hover:bg-blue-50 rounded text-blue-600 transition"
            title="سجل الأنشطة"
        >
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
        </Link>
    );
}
