"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AutoSync() {
  const router = useRouter();

  useEffect(() => {
    // Run sync immediately on mount
    runSync();

    // Set up periodic sync
    const interval = setInterval(runSync, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  async function runSync() {
    try {
      // console.log("Running background sync...");
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "x-trigger": "auto-sync" }
      });

      if (res.ok) {
        const data = await res.json();
        // console.log("Sync completed:", data);
        if (data.newBookings > 0) {
          router.refresh(); // Refresh data if there are new bookings
        }
      }
    } catch (error) {
      console.error("Background sync failed:", error);
    }
  }

  return null;
}
