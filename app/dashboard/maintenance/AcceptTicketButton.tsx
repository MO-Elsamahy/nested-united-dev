"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useDialog } from "@/components/accounting/DialogProvider";

interface AcceptTicketButtonProps {
  ticketId: string;
}

export function AcceptTicketButton({ ticketId }: AcceptTicketButtonProps) {
  const { alert, confirm } = useDialog();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!await confirm("هل تريد قبول هذه التذكرة؟")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/maintenance/${ticketId}/accept`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        await alert(data.error || "حدث خطأ");
      }
    } catch {
      await alert("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAccept}
      disabled={loading}
      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
    >
      <Check className="w-4 h-4" />
      <span>{loading ? "جاري..." : "قبول التذكرة"}</span>
    </button>
  );
}





