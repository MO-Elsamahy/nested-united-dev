"use client";

import { useActivityLog } from "@/lib/hooks/useActivityLog";

/**
 * ActivityLogger component
 * Automatically logs page views and user activity within the dashboard
 */
export function ActivityLogger() {
  useActivityLog();
  return null;
}
