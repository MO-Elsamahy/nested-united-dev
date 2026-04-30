import { LucideIcon } from "lucide-react";
import Image from "next/image";

interface SidebarHeaderProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    iconColorClass?: string; // e.g., "bg-blue-600"
}

export function SidebarHeader({ title, subtitle, icon: _Icon, iconColorClass: _iconColorClass = "bg-blue-600" }: SidebarHeaderProps) {
    return (
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <Image src="/api/company/logo" alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
                <h1 className="font-bold text-gray-900 text-lg leading-tight">{title}</h1>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
    );
}
