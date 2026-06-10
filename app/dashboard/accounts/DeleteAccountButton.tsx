"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDialog } from "@/components/accounting/DialogProvider";

export function DeleteAccountButton({ id, name, onSuccess }: { id: string; name: string; onSuccess?: () => void }) {
  const { alert, confirm } = useDialog();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!await confirm(`هل أنت متأكد من حذف الحساب "${name}"؟`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (response.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.refresh();
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        await alert(errorData.error || "حدث خطأ أثناء الحذف");
      }
    } catch {
      await alert("حدث خطأ");
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







