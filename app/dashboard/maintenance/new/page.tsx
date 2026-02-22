"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function NewMaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unitIdFromUrl = searchParams.get("unit");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [units, setUnits] = useState<any[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(unitIdFromUrl || "");

  useEffect(() => {
    fetch("/api/units")
      .then((res) => res.json())
      .then(setUnits)
      .catch(console.error);
  }, []);

  // Update selected unit when unitIdFromUrl changes
  useEffect(() => {
    if (unitIdFromUrl) {
      setSelectedUnitId(unitIdFromUrl);
    }
  }, [unitIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      unit_id: formData.get("unit_id"),
      title: formData.get("title"),
      description: formData.get("description") || null,
      priority: formData.get("priority") || null,
    };

    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "حدث خطأ");
      }

      router.push("/dashboard/maintenance");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/maintenance" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">تذكرة صيانة جديدة</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الوحدة *</label>
            <select
              name="unit_id"
              required
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الوحدة</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unit_name} {unit.unit_code && `(${unit.unit_code})`}
                </option>
              ))}
            </select>
            {unitIdFromUrl && selectedUnitId && (
              <p className="text-sm text-blue-600 mt-1">
                ✓ تم تحديد الوحدة تلقائياً من صفحة التفاصيل
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">العنوان *</label>
            <input
              type="text"
              name="title"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="مثال: مكيف لا يعمل"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الوصف</label>
            <textarea
              name="description"
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="تفاصيل المشكلة..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">الأولوية</label>
            <select
              name="priority"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الأولوية</option>
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? "جاري الحفظ..." : "إنشاء التذكرة"}
            </button>
            <Link
              href="/dashboard/maintenance"
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}




