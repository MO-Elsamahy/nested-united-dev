"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkAllReadButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      router.refresh();
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-blue-600 hover:text-blue-700 px-4 py-2 text-sm border border-blue-200 rounded hover:bg-blue-50 transition disabled:opacity-50"
    >
      {loading ? "جاري التحديث..." : "تعليم الكل كمقروء"}
    </button>
  );
}






