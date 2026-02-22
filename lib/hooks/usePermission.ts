"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Cache permissions in memory to reduce API calls
const permissionCache = new Map<string, { hasPermission: boolean; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Clear permission cache (called when permissions are updated)
export function clearPermissionCache() {
  permissionCache.clear();
}

// Listen for permission updates
if (typeof window !== "undefined") {
  window.addEventListener("permissions-updated", () => {
    clearPermissionCache();
  });
}

export function usePermission(action: "view" | "edit", pagePath?: string) {
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Use provided pagePath or fallback to current pathname
  const targetPath = pagePath || pathname;

  useEffect(() => {
    const checkPermission = async () => {
      if (!targetPath) {
        setHasPermission(false);
        return;
      }

      // Check cache first
      const cacheKey = `${targetPath}:${action}`;
      const cached = permissionCache.get(cacheKey);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        setHasPermission(cached.hasPermission);
        return;
      }

      try {
        const response = await fetch(
          `/api/permissions/check?page_path=${encodeURIComponent(targetPath)}&action=${action}`
        );
        if (response.ok) {
          const data = await response.json();
          const hasPerm = data.hasPermission;

          // Cache the result
          permissionCache.set(cacheKey, {
            hasPermission: hasPerm,
            timestamp: now,
          });

          setHasPermission(hasPerm);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error("Error checking permission:", error);
        setHasPermission(false);
      }
    };

    checkPermission();
  }, [targetPath, action]);

  return hasPermission;
}

