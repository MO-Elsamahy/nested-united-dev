"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { PATH_NAME_MAP } from "@/lib/navigation-config";

export function Breadcrumbs() {
    const pathname = usePathname();
    const paths = pathname.split("/").filter(Boolean);

    const getPathName = (path: string) => {
        return PATH_NAME_MAP[path] || path;
    };

    return (
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
            {paths.map((path, index) => {
                const href = `/${paths.slice(0, index + 1).join("/")}`;
                const isLast = index === paths.length - 1;
                const name = getPathName(path);

                return (
                    <div key={href} className="flex items-center gap-2">
                        {index > 0 && <ChevronLeft className="w-4 h-4 text-gray-400" />}
                        {isLast ? (
                            <span className="font-semibold text-gray-900">{name}</span>
                        ) : (
                            <Link href={href} className="hover:text-gray-900 transition-colors">
                                {name}
                            </Link>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
