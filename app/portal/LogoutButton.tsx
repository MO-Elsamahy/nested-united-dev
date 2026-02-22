"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
    return (
        <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/50 hover:bg-white text-slate-500 hover:text-red-600 transition-all duration-300 shadow-sm hover:shadow border border-white/50 text-sm font-medium"
        >
            <LogOut className="w-4 h-4" />
            <span>تسجيل خروج</span>
        </button>
    );
}
