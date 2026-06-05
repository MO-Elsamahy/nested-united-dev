"use client";

import { useRouter } from "next/navigation";

export function DateSelector({ currentDate }: { currentDate: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={currentDate}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/hr/attendance?date=${e.target.value}`);
        }
      }}
      className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 shadow-sm font-semibold cursor-pointer"
    />
  );
}
