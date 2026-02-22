"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface SyncLog {
  run_at: string;
  status: "success" | "partial" | "failed";
  message: string;
  units_processed: number;
  errors_count: number;
}

interface SyncStatusProps {
  initialLastSync: SyncLog | null;
  calendarsCount: number;
}

export function SyncStatus({ initialLastSync, calendarsCount }: SyncStatusProps) {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<SyncLog | null>(initialLastSync);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering date on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll for sync updates every 30 seconds
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const response = await fetch("/api/sync");
        const data = await response.json();

        if (data.lastSync) {
          const newSyncTime = new Date(data.lastSync.run_at).getTime();
          const currentSyncTime = lastSync ? new Date(lastSync.run_at).getTime() : 0;

          // If there's a new sync, update the state and refresh the page
          if (newSyncTime > currentSyncTime) {
            setLastSync(data.lastSync);
            setIsRefreshing(true);
            // Refresh the page to get updated stats
            router.refresh();
            // Reset refreshing state after a short delay
            setTimeout(() => setIsRefreshing(false), 1000);
          }
        }
      } catch (error) {
        console.error("[SyncStatus] Error checking sync status:", error);
      }
    };

    // Check immediately, then every 30 seconds
    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [lastSync, router]);

  // Automatic sync every 5 minutes
  useEffect(() => {
    const autoSync = async () => {
      // Don't auto-sync if already syncing manually
      if (isSyncing) return;

      console.log("[AutoSync] Running automatic sync...");
      try {
        const response = await fetch("/api/sync", { method: "POST" });
        const data = await response.json();

        if (data.success) {
          console.log(`[AutoSync] Success: ${data.message}`);
          setLastSync({
            run_at: new Date().toISOString(),
            status: data.status,
            message: data.message,
            units_processed: data.unitsProcessed || 0,
            errors_count: data.errorsCount || 0,
          });
          router.refresh();
        }
      } catch (error) {
        console.error("[AutoSync] Error:", error);
      }
    };

    // Run auto-sync every 5 minutes (300000 ms)
    const autoSyncInterval = setInterval(autoSync, 5 * 60 * 1000);

    // Also run once on mount after a short delay
    const initialSyncTimeout = setTimeout(autoSync, 10000); // 10 seconds after page load

    return () => {
      clearInterval(autoSyncInterval);
      clearTimeout(initialSyncTimeout);
    };
  }, [isSyncing, router]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        // Update local state immediately
        setLastSync({
          run_at: new Date().toISOString(),
          status: data.status,
          message: data.message,
          units_processed: data.unitsProcessed || 0,
          errors_count: data.errorsCount || 0,
        });
        // Refresh the page to get updated stats from server
        router.refresh();
      }
    } catch (error) {
      console.error("[SyncStatus] Error during manual sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            مزامنة التقويمات (iCal)
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {calendarsCount} رابط تقويم مُعد
          </p>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "جاري المزامنة..." : "مزامنة الآن"}</span>
        </button>
      </div>

      {isRefreshing && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-700 text-sm">🔄 جاري تحديث البيانات...</p>
        </div>
      )}

      {lastSync ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">آخر مزامنة:</span>
            <span className="font-medium">
              {mounted ? new Date(lastSync.run_at).toLocaleString("ar-EG") : "..."}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">الحالة:</span>
            <span
              className={`px-2 py-1 rounded text-sm font-medium ${lastSync.status === "success"
                ? "bg-green-100 text-green-700"
                : lastSync.status === "partial"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
                }`}
            >
              {lastSync.status === "success"
                ? "✓ نجحت"
                : lastSync.status === "partial"
                  ? "⚠ جزئية"
                  : "✗ فشلت"}
            </span>
          </div>
          {lastSync.message && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">الرسالة:</span>
              <span className="text-sm">{lastSync.message}</span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>وحدات: {lastSync.units_processed || 0}</span>
            {lastSync.errors_count > 0 && (
              <span className="text-red-600">أخطاء: {lastSync.errors_count}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            ⚠ لم يتم تشغيل المزامنة بعد. اضغط &quot;مزامنة الآن&quot; لبدء المزامنة.
          </p>
          {calendarsCount === 0 && (
            <p className="text-yellow-600 text-sm mt-2">
              تحتاج أولاً إضافة روابط iCal للوحدات من صفحة الوحدات.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

