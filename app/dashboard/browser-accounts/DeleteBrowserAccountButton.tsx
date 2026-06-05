"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { useDialog } from "@/components/accounting/DialogProvider";

interface DeleteBrowserAccountButtonProps {
  accountId: string;
  accountName: string;
}

export function DeleteBrowserAccountButton({
  accountId,
  accountName,
}: DeleteBrowserAccountButtonProps) {
  const { alert, confirm } = useDialog();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!await confirm(`هل تريد حذف "${accountName}"؟\n\nسيتم حذف بيانات تسجيل الدخول المحفوظة.`)) {
      return;
    }

    setLoading(true);

    try {
      // Remove from Electron if available
      if (window.electronAPI) {
        await window.electronAPI.removeBrowserAccount(accountId);
      }

      // Delete from database
      const response = await fetch(`/api/browser-accounts/${accountId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        await alert(data.error || "حدث خطأ");
      }
    } catch {
      await alert("حدث خطأ في الحذف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
      title="حذف الحساب"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Trash2 className="w-5 h-5" />
      )}
    </button>
  );
}
