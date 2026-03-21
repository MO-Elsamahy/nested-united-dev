"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

export function UnitsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const isInitialMount = useRef(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const statusFilter = searchParams.get("status") || "all";
  const platformFilter = searchParams.get("platform") || "all";

  const hasActiveFilters = statusFilter !== "all" || platformFilter !== "all" || searchQuery !== "";

  // Sync search query with URL params (only on mount or external URL changes)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Only update if URL changed externally (not from our own updates)
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [urlSearch]);

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const queryString = params.toString();
    const url = `/dashboard/units${queryString ? `?${queryString}` : ""}`;
    router.replace(url);
    router.refresh();
  }, [router, searchParams]);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    router.replace("/dashboard/units");
    router.refresh();
  }, [router]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery === "") {
        params.delete("search");
      } else {
        params.set("search", searchQuery);
      }
      const queryString = params.toString();
      const currentSearch = searchParams.get("search") || "";
      if (searchQuery !== currentSearch) {
        const url = `/dashboard/units${queryString ? `?${queryString}` : ""}`;
        router.replace(url);
        router.refresh();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, router, searchParams]);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">فلترة الوحدات</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            الحالة
          </label>
          <select
            value={statusFilter}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">جميع الحالات</option>
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
          </select>
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            المنصة
          </label>
          <select
            value={platformFilter}
            onChange={(e) => updateFilter("platform", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">جميع المنصات</option>
            <option value="airbnb">Airbnb</option>
            <option value="gathern">Gathern</option>
            <option value="zomrahub">Zomrahub</option>
          </select>
        </div>

        {/* Search Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البحث
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الكود..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {statusFilter !== "all" && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
              الحالة: {statusFilter === "active" ? "نشطة" : "غير نشطة"}
              <button
                onClick={() => updateFilter("status", "all")}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {platformFilter !== "all" && (
            <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${platformFilter === "airbnb"
                ? "bg-red-100 text-red-700"
                : platformFilter === "gathern"
                  ? "bg-green-100 text-green-700"
                  : "bg-purple-100 text-purple-700"
              }`}>
              المنصة: {platformFilter === "airbnb" ? "Airbnb" : platformFilter === "gathern" ? "Gathern" : "Zomrahub"}
              <button
                onClick={() => updateFilter("platform", "all")}
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-2">
              البحث: {searchQuery}
              <button
                onClick={() => updateFilter("search", "")}
                className="hover:text-purple-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

