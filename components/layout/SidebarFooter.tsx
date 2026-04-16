import Link from "next/link";
import { Building2, ArrowRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarFooterProps {
    user: {
        name: string;
        role: string;
    };
}

export function SidebarFooter({ user }: SidebarFooterProps) {
    return (
        <div className="p-4 border-t border-gray-100 space-y-2">
            {/* User Profile */}
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                    {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="تسجيل الخروج"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>

            {/* Back to Portal */}
            <Link
                href="/portal"
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-primary transition-all group"
            >
                <Building2 className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                <span className="flex-1">العودة للبوابة</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-transform group-hover:translate-x-[-4px]" />
            </Link>
        </div>
    );
}
