"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useActivityLog() {
  const pathname = usePathname();
  const loggedPages = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Log page view for all dashboard pages
    if (pathname && !loggedPages.current.has(pathname)) {
      loggedPages.current.add(pathname);
      
      // Only log dashboard pages
      if (pathname.startsWith("/dashboard")) {
        logActivity({
          action_type: "page_view",
          page_path: pathname,
          description: `عرض صفحة: ${pathname}`,
        });
      }
    }
  }, [pathname]);
}

export async function logActivity(data: {
  action_type: string;
  page_path?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  description?: string | null;
  metadata?: any;
}) {
  try {
    await fetch("/api/activity-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // Silently fail - logging shouldn't break the app
    console.error("Failed to log activity:", error);
  }
}

