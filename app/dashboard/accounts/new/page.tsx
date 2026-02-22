"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";

export default function NewAccountPage() {
  const router = useRouter();
  const canEdit = usePermission("edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (canEdit === false) {
      router.push("/dashboard/accounts?error=no_permission");
    }
  }, [canEdit, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      platform: formData.get("platform"),
      account_name: formData.get("account_name"),
      notes: formData.get("notes") || null,
    };

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "حدث خطأ");
      }

      router.push("/dashboard/accounts");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (canEdit === null) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  if (canEdit === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          <p className="font-semibold mb-2">ليس لديك صلاحية لإضافة الحسابات</p>
          <Link href="/dashboard/accounts" className="text-blue-600 hover:underline">
            العودة للحسابات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/accounts"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowRight className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">إضافة حساب جديد</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المنصة *
            </label>
            <select
              name="platform"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر المنصة</option>
              <option value="airbnb">Airbnb</option>
              <option value="gathern">Gathern / جاذر</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم الحساب *
            </label>
            <input
              type="text"
              name="account_name"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="مثال: حساب الرياض"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ملاحظات
            </label>
            <textarea
              name="notes"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "حفظ الحساب"}
            </button>
            <Link
              href="/dashboard/accounts"
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}




