"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Plus, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface CalendarItem {
    id: string;
    platform: string;
    ical_url: string;
    is_primary: boolean;
    platform_account?: {
        account_name: string;
    };
}

interface AccountItem {
    id: string;
    account_name: string;
    platform: string;
}

export default function UnitCalendarsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then(setAccounts)
      .catch(console.error);
  }, []);

  const fetchCalendars = useCallback(() => {
    fetch(`/api/units/${id}/calendars`)
      .then((res) => res.json())
      .then(setCalendars)
      .catch(console.error);
  }, [id]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      platform: formData.get("platform"),
      ical_url: formData.get("ical_url"),
      is_primary: formData.get("is_primary") === "on",
      platform_account_id: formData.get("platform_account_id") || null,
    };

    try {
      const response = await fetch(`/api/units/${id}/calendars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        fetchCalendars();
        setShowForm(false);
        (e.target as HTMLFormElement).reset();
      } else {
        const result = await response.json();
        alert(result.error || "حدث خطأ");
      }
    } catch {
      alert("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (calendarId: string) => {
    if (!confirm("هل أنت متأكد من حذف رابط التقويم؟")) return;

    try {
      const response = await fetch(`/api/units/${id}/calendars?calendarId=${calendarId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCalendars();
      }
    } catch {
      alert("حدث خطأ");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/dashboard/units/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">روابط التقويم (iCal)</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">الروابط الحالية</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة رابط</span>
          </button>
        </div>

        {calendars.length > 0 ? (
          <div className="space-y-3">
            {calendars.map((cal) => (
              <div key={cal.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-gray-500" />
                      <span
                        className={`px-2 py-1 rounded text-xs ${cal.platform === "airbnb"
                          ? "bg-red-100 text-red-600"
                          : cal.platform === "gathern"
                            ? "bg-green-100 text-green-600"
                            : "bg-purple-100 text-purple-600"
                          }`}
                      >
                        {cal.platform === "airbnb" ? "Airbnb" : cal.platform === "gathern" ? "Gathern" : "Zomrahub"}
                      </span>
                      {cal.is_primary && (
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-600">
                          رئيسي
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm break-all">{cal.ical_url}</p>
                    {cal.platform_account && (
                      <p className="text-gray-500 text-xs mt-1">
                        الحساب: {cal.platform_account.account_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(cal.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">لا توجد روابط تقويم</p>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-lg mb-4">إضافة رابط تقويم جديد</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">المنصة *</label>
              <select
                name="platform"
                id="platform"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                onChange={(_e) => {
                  // Reset account select when platform changes
                  const accountSelect = document.getElementById("platform_account_id") as HTMLSelectElement;
                  if (accountSelect) accountSelect.value = "";
                }}
              >
                <option value="">اختر المنصة</option>
                <option value="airbnb">Airbnb</option>
                <option value="gathern">Gathern</option>
                <option value="zomrahub">Zomrahub</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الحساب</label>
              <select
                name="platform_account_id"
                id="platform_account_id"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الحساب (اختياري)</option>
                {accounts
                  .filter((acc) => {
                    const platformSelect = document.getElementById("platform") as HTMLSelectElement;
                    return !platformSelect || !platformSelect.value || acc.platform === platformSelect.value;
                  })
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_name} ({acc.platform === "airbnb" ? "Airbnb" : acc.platform === "gathern" ? "Gathern" : "Zomrahub"})
                    </option>
                  ))}
              </select>
              <p className="text-gray-500 text-xs mt-1">
                اختر الحساب المرتبط بهذا التقويم (اختياري)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">رابط iCal *</label>
              <input
                type="url"
                name="ical_url"
                required
                placeholder="https://..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-gray-500 text-xs mt-1">
                يمكنك الحصول على الرابط من إعدادات التقويم في Airbnb أو Gathern
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="is_primary" id="is_primary" className="rounded" />
              <label htmlFor="is_primary" className="text-sm text-gray-700">
                تقويم رئيسي
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg disabled:opacity-50"
              >
                {loading ? "جاري الحفظ..." : "إضافة"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}






