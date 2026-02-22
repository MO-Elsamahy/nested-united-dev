"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

interface AcceptTicketButtonProps {
  ticketId: string;
}

export function AcceptTicketButton({ ticketId }: AcceptTicketButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!confirm("هل تريد قبول هذه التذكرة؟")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/maintenance/${ticketId}/accept`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "حدث خطأ");
      }
    } catch {
      alert("حدث خطأ في الاتصال");
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





