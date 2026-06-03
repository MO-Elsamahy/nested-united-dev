interface CacheEntry {
  data: any;
  timestamp: number;
}

// Persist cache across hot-reloads in Next.js development server
const globalForCache = global as unknown as {
  analyticsCache?: Map<string, CacheEntry>;
};

export const analyticsCache =
  globalForCache.analyticsCache || new Map<string, CacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForCache.analyticsCache = analyticsCache;
}

export const CACHE_TTL = 30000; // 30 seconds

/**
 * Generates a unique key based on query filters
 */
export function getCacheKey(
  account: string,
  range: string,
  startDate: string,
  endDate: string
): string {
  return `${account}_${range}_${startDate || "none"}_${endDate || "none"}`;
}

/**
 * Invalidates/clears all cached entries
 */
export function clearAnalyticsCache(): void {
  analyticsCache.clear();
  console.log("[Analytics Cache] Cache cleared/invalidated.");
}
