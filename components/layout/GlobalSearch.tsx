"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Search, User, Users, Briefcase, ChevronRight, Loader2 } from "lucide-react";
import { getSearchablePages, normalizeSearchText } from "@/lib/search-indexing";

const TYPE_META: Record<string, { icon: any; color: string; label: string; basePath: string }> = {
    customer: { icon: Users, color: "text-blue-500", label: "عميل", basePath: "/crm/customers" },
    employee: { icon: User, color: "text-green-500", label: "موظف", basePath: "/hr/employees" },
    deal: { icon: Briefcase, color: "text-purple-500", label: "صفقة", basePath: "/crm/deals" },
};

export function GlobalSearch() {
    const router = useRouter();
    const { data: session } = useSession();
    const isSuperAdmin = (session?.user as any)?.role === "super_admin";
    
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);

    // Ctrl+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
            }
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (listRef.current && !listRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Debounced search
    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.results || []);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    // Filtered nav shortcuts based on query and permissions
    const navItems = useMemo(() => getSearchablePages(), []);
    
    const navMatches = useMemo(() => {
        if (!query || query.length < 1) return [];
        
        const normQuery = normalizeSearchText(query);
        
        const userRole = (session?.user as { role?: string } | undefined)?.role ?? "";

        return navItems.filter(item => {
            // Permission check
            if (item.requiresSuperAdmin && !isSuperAdmin) return false;
            if (item.allowedRoles?.length && !item.allowedRoles.includes(userRole)) return false;

            // Match against label, subtitle, or keywords
            return (
                normalizeSearchText(item.label).includes(normQuery) ||
                normalizeSearchText(item.subtitle).includes(normQuery) ||
                item.keywords.some(k => normalizeSearchText(k).includes(normQuery))
            );
        });
    }, [query, navItems, isSuperAdmin, session?.user]);

    const allItems = [...navMatches.map(n => ({ ...n, _type: "nav" })), ...results];

    const navigate = useCallback((item: any) => {
        if (item._type === "nav") {
            router.push(item.href);
        } else {
            const meta = TYPE_META[item.type];
            router.push(`${meta.basePath}/${item.id}`);
        }
        setOpen(false);
        setQuery("");
    }, [router]);

    // Keyboard nav in list
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(a + 1, allItems.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
        if (e.key === "Enter" && allItems[active]) navigate(allItems[active]);
    };

    const showDropdown = open && (loading || allItems.length > 0 || query.length >= 2);

    return (
        <div className="relative hidden md:block w-80 xl:w-96">
            {/* Input */}
            <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {loading
                        ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        : <Search className="h-4 w-4 text-gray-400" />}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="block w-full pr-9 pl-10 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 transition-colors"
                    placeholder="بحث في النظام... (Ctrl+K)"
                />
                {query && (
                    <button onClick={() => { setQuery(""); setResults([]); }} className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600">
                        <span className="text-xs">✕</span>
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
                <div ref={listRef} className="absolute top-full mt-1 right-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                    {loading && !allItems.length && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">جاري البحث...</div>
                    )}

                    {!loading && query.length >= 2 && allItems.length === 0 && (
                        <div className="px-4 py-3 text-sm text-gray-400 text-center">لا توجد نتائج لـ "{query}"</div>
                    )}

                    {allItems.map((item, i) => {
                        const isNav = item._type === "nav";
                        const meta = !isNav ? TYPE_META[item.type] : null;
                        const Icon = isNav ? ChevronRight : meta!.icon;
                        return (
                            <button
                                key={i}
                                onClick={() => navigate(item)}
                                onMouseEnter={() => setActive(i)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${i === active ? "bg-blue-50" : "hover:bg-gray-50"} ${i > 0 ? "border-t border-gray-50" : ""}`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isNav ? "text-gray-400" : meta!.color}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{item.label || item.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{item.subtitle || (meta?.label)}</p>
                                </div>
                                {isNav && <span className="text-xs text-gray-300 shrink-0">انتقال</span>}
                                {!isNav && item.phone && <span className="text-xs text-gray-300 shrink-0 font-mono">{item.phone}</span>}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
