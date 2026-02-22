"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdateStatusButton({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        router.refresh();
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    open: "border-red-300 text-red-600 bg-red-50",
    in_progress: "border-yellow-300 text-yellow-600 bg-yellow-50",
    resolved: "border-green-300 text-green-600 bg-green-50",
  };

  return (
    <select
      value={currentStatus}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className={`px-3 py-1 rounded border text-sm font-medium ${statusColors[currentStatus]} disabled:opacity-50`}
    >
      <option value="open">مفتوحة</option>
      <option value="in_progress">قيد التنفيذ</option>
      <option value="resolved">محلولة</option>
    </select>
  );
}







