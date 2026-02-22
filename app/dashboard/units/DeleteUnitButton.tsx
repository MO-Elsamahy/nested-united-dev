"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteUnitButton({ unitId, unitName }: { unitId: string; unitName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/units/${unitId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "فشل حذف الوحدة");
      }

      router.refresh();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء حذف الوحدة");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        حذف
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">⚠️ تأكيد الحذف</h3>
            <p className="text-gray-700 mb-4">
              هل أنت متأكد من حذف الوحدة <strong>{unitName}</strong>؟
            </p>
            <p className="text-sm text-gray-600 mb-4">
              سيتم حذف الوحدة وجميع البيانات المرتبطة بها (الحجوزات، التقويمات، تذاكر الصيانة).
              لا يمكن التراجع عن هذا الإجراء.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? "جاري الحذف..." : "حذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




