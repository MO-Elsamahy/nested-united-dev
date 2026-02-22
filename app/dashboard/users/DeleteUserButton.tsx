"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
  userEmail: string;
}

export function DeleteUserButton({ userId, userName, userEmail }: DeleteUserButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "حدث خطأ");
      }

      setIsOpen(false);
      router.refresh();
      alert("تم حذف المستخدم بنجاح");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50 flex items-center gap-1"
      >
        <Trash2 className="w-4 h-4" />
        <span>حذف</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-semibold text-red-600">⚠️ تأكيد الحذف</h2>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <p className="text-gray-700">
                هل أنت متأكد من حذف المستخدم <strong>{userName}</strong> ({userEmail})؟
              </p>
              <p className="text-sm text-gray-600">
                سيتم حذف المستخدم وجميع البيانات المرتبطة به. لا يمكن التراجع عن هذا الإجراء.
              </p>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg disabled:opacity-50"
                >
                  {loading ? "جاري الحذف..." : "حذف"}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


