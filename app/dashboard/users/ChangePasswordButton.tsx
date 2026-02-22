"use client";

import { useState } from "react";
import { Key } from "lucide-react";

export function ChangePasswordButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!newPassword || !confirmPassword) {
      setError("يرجى إدخال كلمة المرور الجديدة");
      return;
    }

    if (newPassword.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمات المرور غير متطابقة");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "فشل تغيير كلمة المرور");
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
      >
        <Key className="w-4 h-4" />
        تغيير كلمة المرور
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">تغيير كلمة المرور</h3>
            <p className="text-sm text-gray-600 mb-4">المستخدم: {userEmail}</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="أعد إدخال كلمة المرور"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
                  ✓ تم تغيير كلمة المرور بنجاح
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setError(null);
                    setSuccess(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? "جاري التغيير..." : "تغيير"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}




