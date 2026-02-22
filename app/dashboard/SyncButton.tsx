"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const data = await response.json();
      setResult(data);
      router.refresh();
    } catch (error) {
      setResult({ success: false, error: "حدث خطأ في الاتصال" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
      >
        <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        <span>{loading ? "جاري المزامنة..." : "مزامنة الآن"}</span>
      </button>

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? result.status === "success"
                ? "bg-green-50 border border-green-200"
                : result.status === "partial"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          {result.success ? (
            <div className="space-y-1">
              <p className="font-medium">
                {result.status === "success"
                  ? "✅ تمت المزامنة بنجاح"
                  : result.status === "partial"
                  ? "⚠️ تمت المزامنة جزئيًا"
                  : "❌ فشلت المزامنة"}
              </p>
              <p className="text-sm text-gray-600">{result.message}</p>
              {result.duration && (
                <p className="text-xs text-gray-500">المدة: {result.duration}</p>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-600">الأخطاء:</p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-red-600">❌ {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}






