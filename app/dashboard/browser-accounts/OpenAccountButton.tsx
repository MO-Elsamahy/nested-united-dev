"use client";

import { useState, useEffect } from "react";
import { Loader2, Monitor, AlertCircle } from "lucide-react";
import { isElectron } from "@/lib/utils/isElectron";

interface OpenAccountButtonProps {
  accountId: string;
  accountName: string;
  platform: string;
  partition: string;
}

export function OpenAccountButton({
  accountId,
  accountName: _accountName,
  platform,
  partition: _partition,
}: OpenAccountButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [electronEnv, setElectronEnv] = useState<boolean | null>(null);

  useEffect(() => {
    setElectronEnv(isElectron());
  }, []);

  const _platformUrl = platform === "airbnb"
    ? "https://www.airbnb.com/hosting/inbox"
    : platform === "gathern"
      ? "https://business.gathern.co"
      : "https://web.whatsapp.com";

  // Web version — show disabled button with tooltip
  if (electronEnv === false) {
    return (
      <div className="relative group">
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
        >
          <Monitor className="w-4 h-4" />
          <span>فتح</span>
        </button>
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-20 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          افتح تطبيق سطح المكتب لاستخدام هذه الميزة
        </div>
      </div>
    );
  }

  const handleOpen = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!window.electronAPI) {
        throw new Error("بيئة Electron غير متوفرة");
      }
      // Call local Electron IPC to open browser instead of server API
      const result = await window.electronAPI.openBrowserAccount({
        id: accountId,
        platform,
        accountName: _accountName,
        partition: _partition,
      });

      if (!result?.success) {
        throw new Error(result?.error || "فشل في فتح الحساب");
      }
    } catch (err: unknown) {
      console.error("Error opening browser:", err);
      setError(err instanceof Error ? err.message : "خطأ في الاتصال بالسيرفر");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        disabled={loading || electronEnv === null}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50 shadow-sm hover:shadow-md"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Monitor className="w-4 h-4" />
        )}
        <span>فتح</span>
      </button>

      {error && (
        <div className="absolute top-full right-0 mt-2 px-3 py-2 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap z-10 shadow-lg flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
