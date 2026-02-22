"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف الحساب "${name}"؟`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (response.ok) {
        router.refresh();
      } else {
        alert("حدث خطأ أثناء الحذف");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:bg-red-50 px-3 py-1 rounded border border-red-200 disabled:opacity-50"
    >
      {loading ? "..." : "حذف"}
    </button>
  );
}







