"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeleteBookingButtonProps {
  bookingId: string;
  canEdit?: boolean;
}

export function DeleteBookingButton({ bookingId, canEdit = false }: DeleteBookingButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!canEdit) {
    return null;
  }

  const handleDelete = async () => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز؟")) return;

    setDeleting(true);
    try {
      // Extract actual ID (remove "booking-" or "reservation-" prefix)
      const actualId = bookingId.replace(/^(booking|reservation)-/, "");
      const isReservation = bookingId.startsWith("reservation-");

      // Use appropriate endpoint
      const endpoint = isReservation
        ? `/api/reservations/${actualId}`
        : `/api/bookings/${actualId}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("فشل الحذف");
      }
    } catch (error) {
      console.error(error);
      alert("حدث خطأ");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
      {deleting ? "جاري الحذف..." : "حذف"}
    </button>
  );
}
