"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleUserButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    const action = isActive ? "تعطيل" : "تفعيل";
    if (!confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${id}/toggle`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("حدث خطأ");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-3 py-1 text-sm border rounded disabled:opacity-50 ${
        isActive
          ? "text-orange-600 border-orange-200 hover:bg-orange-50"
          : "text-green-600 border-green-200 hover:bg-green-50"
      }`}
    >
      {loading ? "..." : isActive ? "تعطيل" : "تفعيل"}
    </button>
  );
}






