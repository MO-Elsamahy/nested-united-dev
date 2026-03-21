"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTER_OPTIONS = [
  { value: "all", label: "الكل", icon: "📋" },
  { value: "checkout_today", label: "خروج اليوم", icon: "📤" },
  { value: "checkin_today", label: "دخول اليوم", icon: "📥" },
  { value: "awaiting_cleaning", label: "في انتظار التنظيف", icon: "⏳" },
  { value: "cleaning_in_progress", label: "قيد التنظيف", icon: "🧹" },
  { value: "ready", label: "جاهزة للتسكين", icon: "✅" },
  { value: "occupied", label: "تم التسكين", icon: "🏠" },
  { value: "booked", label: "إشغال", icon: "📅" },
  { value: "guest_not_checked_out", label: "الضيف لم يخرج", icon: "⚠️" },
];

export function StatusFilterButtons({ currentStatus }: { currentStatus?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeStatus = currentStatus || searchParams.get("status") || "all";

  const handleFilter = (value: string) => {
    if (value === "all") {
      router.replace("/dashboard/unit-readiness");
    } else {
      router.replace(`/dashboard/unit-readiness?status=${value}`);
    }
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">تصفية حسب الحالة</h3>
      </div>

      <div className="flex flex-wrap gap-2 pb-2">
        {FILTER_OPTIONS.map((option) => {
          const isActive = activeStatus === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleFilter(option.value)}
              className={`
                px-3.5 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 border
                ${isActive
                  ? "bg-gray-900 text-white border-gray-900 shadow-md transform scale-105"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }
              `}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}




