"use client";

import { Edit } from "lucide-react";
import Link from "next/link";

interface EditBookingButtonProps {
  bookingId: string;
  canEdit?: boolean;
}

export function EditBookingButton({ bookingId, canEdit = false }: EditBookingButtonProps) {
  if (!canEdit) {
    return null;
  }

  // Extract actual ID (remove "booking-" or "reservation-" prefix)
  const actualId = bookingId.replace(/^(booking|reservation)-/, "");
  const isReservation = bookingId.startsWith("reservation-");

  // For reservations, link to convert page; for bookings, link to edit page
  const href = isReservation
    ? `/dashboard/bookings/convert/${actualId}`
    : `/dashboard/bookings/${actualId}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
    >
      <Edit className="w-4 h-4" />
      {isReservation ? "تحويل" : "تعديل"}
    </Link>
  );
}
