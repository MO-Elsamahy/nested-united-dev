"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useDialog } from "@/components/accounting/DialogProvider";
import { Edit } from "lucide-react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/lib/hooks/usePermission";

import { Unit } from "@/lib/types/pms";

const STATUS_OPTIONS = [
  { value: "checkout_today", label: "خروج اليوم", icon: "📤" },
  { value: "checkin_today", label: "دخول اليوم", icon: "📥" },
  { value: "guest_not_checked_out", label: "الضيف لم يخرج", icon: "⚠️" },
  { value: "awaiting_cleaning", label: "في انتظار التنظيف", icon: "⏳" },
  { value: "cleaning_in_progress", label: "قيد التنظيف", icon: "🧹" },
  { value: "ready", label: "جاهزة للتسكين", icon: "✅" },
  { value: "occupied", label: "تم التسكين", icon: "🏠" },
  { value: "booked", label: "إشغال", icon: "📅" },
];

export function UpdateStatusButton({ 
  unit, 
  currentStatus,
  onSuccess
}: { 
  unit: Unit; 
  currentStatus: string;
  onSuccess?: () => void;
}) {
  const { data: session } = useSession();
  const { alert } = useDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "guest">("status");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasEditPermission = usePermission("edit", "/dashboard/unit-readiness");

  const formatDateForInput = (dateObj: string | number | Date | null | undefined) => {
    if (!dateObj) return "";
    const d = new Date(dateObj);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const hasActiveBooking = !!(unit as any).active_manual_guest || !!(unit as any).active_ical_guest;

  const [formData, setFormData] = useState({
    status: currentStatus,
    checkout_date: formatDateForInput(unit.readiness_checkout_date),
    checkin_date: formatDateForInput(unit.readiness_checkin_date),
    guest_name: unit.readiness_guest_name || "",
    notes: unit.readiness_notes || "",
  });
  const router = useRouter();

  const userRole = session?.user?.role;
  const isDefaultAuthorized = userRole === "admin" || userRole === "super_admin" || userRole === "maintenance_worker";
  const canUpdate = isDefaultAuthorized || hasEditPermission === true;

  if (!canUpdate) return null;

  const openWithDefaults = async () => {
    setActiveTab("status");
    setIsOpen(true);

    // لو مفيش تواريخ محفوظة، نحاول نجيبها تلقائياً من الحجوزات (iCal + يدوي)
    if (!unit.readiness_checkout_date && !unit.readiness_checkin_date) {
      try {
        setIsPrefilling(true);
        const res = await fetch(`/api/units/${unit.id}/readiness-default`);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data) return;

        setFormData((prev) => ({
          ...prev,
          checkout_date: data.checkout_date ? formatDateForInput(data.checkout_date) : prev.checkout_date,
          checkin_date: data.checkin_date ? formatDateForInput(data.checkin_date) : prev.checkin_date,
          guest_name: data.guest_name || prev.guest_name,
        }));
      } catch (err) {
        console.error("Failed to prefill readiness from bookings:", err);
      } finally {
        setIsPrefilling(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/units/${unit.id}/readiness`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "فشل تحديث الحالة");
      }

      setIsOpen(false);
      router.refresh();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating status:", error);
      await alert(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تحديث الحالة"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={openWithDefaults}
        className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-md hover:bg-black transition-colors flex items-center justify-center gap-1.5 shadow-sm font-medium"
      >
        <Edit className="w-3.5 h-3.5" />
        {isPrefilling ? "جاري..." : "تحديث الحالة"}
      </button>

      {/* Modal */}
      {isOpen && mounted && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-150 text-right" dir="rtl">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                تحديث حالة الوحدة: {unit.unit_name}
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Tab buttons */}
            <div className="px-6 pt-4 flex gap-2 border-b border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setActiveTab("status")}
                className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition-all ${
                  activeTab === "status"
                    ? "border-blue-600 text-blue-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                🔧 حالة الجاهزية
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("guest")}
                className={`flex-1 pb-3 text-center text-sm font-bold border-b-2 transition-all ${
                  activeTab === "guest"
                    ? "border-blue-600 text-blue-600 font-black"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                👤 بيانات الضيف
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-4">
                {activeTab === "status" ? (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Status */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        الحالة
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        required
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.icon} {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        ملاحظات (اختياري)
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="ملاحظات إضافية عن حالة الوحدة..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Guest Name */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        اسم الضيف
                        {hasActiveBooking && <span className="mr-2 text-xs text-blue-500 font-normal">(من الحجز - قابل للتعديل)</span>}
                      </label>
                      <input
                        type="text"
                        value={formData.guest_name}
                        onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                        placeholder="اسم الضيف ثلاثي..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    {/* Checkin Date */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        تاريخ الدخول
                        {hasActiveBooking && <span className="mr-2 text-xs text-blue-500 font-normal">(من الحجز)</span>}
                      </label>
                      <input
                        type="date"
                        value={formData.checkin_date}
                        onChange={(e) => setFormData({ ...formData, checkin_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    {/* Checkout Date */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        تاريخ الخروج
                        {hasActiveBooking && <span className="mr-2 text-xs text-blue-500 font-normal">(من الحجز)</span>}
                      </label>
                      <input
                        type="date"
                        value={formData.checkout_date}
                        onChange={(e) => setFormData({ ...formData, checkout_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {isSubmitting ? "جاري الحفظ..." : "حفظ"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

