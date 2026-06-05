"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/accounting/DialogProvider";

export function DeleteTicketButton({ id }: { id: string }) {
  const { alert, confirm } = useDialog();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!await confirm("هل أنت متأكد من حذف هذه التذكرة؟ لا يمكن التراجع عن هذا الإجراء.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل الحذف");
      }

      router.refresh();
    } catch (error) {
      await alert(error instanceof Error ? error.message : "حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      title="حذف التذكرة"
    >
      <Trash2 className="w-5 h-5" />
    </button>
  );
}
