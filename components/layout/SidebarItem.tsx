"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function SidebarItem({ label, href, icon: Icon }: SidebarItemProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let isActive = false;

  if (href.includes("?")) {
    const [basePath, searchStr] = href.split("?");
    const hrefParams = new URLSearchParams(searchStr);
    
    const matchesPath = pathname === basePath;
    let matchesParams = true;
    
    hrefParams.forEach((val, key) => {
      const currentVal = searchParams.get(key);
      if (currentVal !== val) {
        // Fallback for default tab "executive" when no tab parameter is present in URL
        if (key === "tab" && val === "executive" && !currentVal) {
          // Keep true
        } else {
          matchesParams = false;
        }
      }
    });
    
    isActive = matchesPath && matchesParams;
  } else {
    isActive = pathname === href;
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        isActive
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-700 hover:bg-gray-50"
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}


