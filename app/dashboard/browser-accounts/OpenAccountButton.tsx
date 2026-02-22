"use client";

import { useState } from "react";
import { Loader2, Monitor, AlertCircle } from "lucide-react";

interface OpenAccountButtonProps {
  accountId: string;
  accountName: string;
  platform: string;
  partition: string;
}

export function OpenAccountButton({
  accountId,
  accountName,
  platform,
  partition,
}: OpenAccountButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setLoading(true);
    setError(null);

    try {
      // Call Server API to open browser
      const response = await fetch("/api/browser/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل في فتح الحساب");
      }

      // Success feedback (optional: toast notification)
    } catch (err: any) {
      console.error("Error opening browser:", err);
      setError(err.message || "خطأ في الاتصال بالسيرفر");
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        disabled={loading}
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
