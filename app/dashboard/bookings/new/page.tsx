 "use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Plus } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermission";

interface UnitOption {
  id: string;
  unit_name: string;
  unit_code: string | null;
  platform_account_id?: string | null;
}

interface AccountOption {
  id: string;
  account_name: string;
  platform: string;
}

export default function NewBookingPage() {
  const router = useRouter();
  // Check edit permission specifically for bookings page
  const canEdit = usePermission("edit", "/dashboard/bookings");

  useEffect(() => {
    if (canEdit === false) {
      router.push("/dashboard/bookings?error=no_permission");
    }
  }, [canEdit, router]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const [overlapData, setOverlapData] = useState<{ id: string, type: string, guest_name?: string, checkin_date?: string, checkout_date?: string, platform?: string | null } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const unitId = e.target.value;
    const selectedUnit = units.find(u => u.id === unitId);
    if (selectedUnit?.platform_account_id) {
      setSelectedAccountId(selectedUnit.platform_account_id);
    } else {
      setSelectedAccountId("");
    }
  };

  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((data) => setUnits(data || []))
      .catch(() => setUnits([]));

    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => setAccounts(data || []))
      .catch(() => setAccounts([]));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOverlapData(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      unit_id: form.get("unit_id"),
      platform_account_id: form.get("platform_account_id") || null,
      platform: form.get("platform") || null,
      guest_name: form.get("guest_name"),
      phone: form.get("phone") || null,
      checkin_date: form.get("checkin_date"),
      checkout_date: form.get("checkout_date"),
      amount: form.get("amount") ? Number(form.get("amount")) : 0,
      currency: form.get("currency") || "SAR",
      notes: form.get("notes") || null,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        if (res.status === 409 && result.overlap) {
          setOverlapData(result.overlap);
        }
        throw new Error(result.error || "فشل إنشاء الحجز");
      }
      
      const amountVal = payload.amount || 0;
      if (amountVal > 0) {
        router.push(`/dashboard/bookings?deal_created=true&amount=${amountVal}`);
      } else {
        router.push("/dashboard/bookings");
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "فشل إنشاء الحجز");
    } finally {
      setLoading(false);
    }
  };

  if (canEdit === null) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  if (canEdit === false) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          <p className="font-semibold mb-2">ليس لديك صلاحية لإضافة الحجوزات</p>
          <Link href="/dashboard/bookings" className="text-blue-600 hover:underline">
            العودة للحجوزات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/bookings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إضافة حجز</h1>
          <p className="text-gray-600 text-sm">تسجيل حجز يدوي مع بيانات الضيف والمبلغ</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="flex flex-col gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold">{error}</span>
            </div>
            {overlapData && (
              <div className="mt-2 text-sm border-t border-red-200 pt-3">
                <p className="mb-3 font-medium">يوجد حجز مسجل بالفعل في هذه التواريخ. تفاصيل الحجز المتعارض:</p>
                <div className="bg-white/50 p-3 rounded border border-red-100 mb-3 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">نوع الحجز:</span>
                    <span className="font-semibold">{overlapData.type === 'ical' ? 'حجز iCal (خارجي)' : 'حجز يدوي'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الاسم / الوصف:</span>
                    <span className="font-semibold">{overlapData.guest_name || 'غير متوفر'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المنصة:</span>
                    <span className="font-semibold">{overlapData.platform || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ الدخول:</span>
                    <span className="font-semibold text-left" dir="ltr">{overlapData.checkin_date ? new Date(overlapData.checkin_date).toISOString().split('T')[0] : 'غير متوفر'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ الخروج:</span>
                    <span className="font-semibold text-left" dir="ltr">{overlapData.checkout_date ? new Date(overlapData.checkout_date).toISOString().split('T')[0] : 'غير متوفر'}</span>
                  </div>
                </div>
                <p className="mb-3 text-red-700">هل ترغب في استكمال أو تعديل هذا الحجز بدلاً من إضافة حجز جديد؟</p>
                <Link
                  href={overlapData.type === 'ical' ? `/dashboard/bookings/convert/${overlapData.id}` : `/dashboard/bookings/edit/${overlapData.id}`}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors shadow-sm w-full justify-center"
                >
                  {overlapData.type === 'ical' ? 'استكمال هذا الحجز (iCal)' : 'تعديل هذا الحجز'}
                  <ArrowRight className="w-4 h-4 mr-1" />
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الوحدة *</label>
              <select name="unit_id" required className="w-full border rounded px-3 py-2" onChange={handleUnitChange}>
                <option value="">اختر الوحدة</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unit_name} {u.unit_code ? `(${u.unit_code})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">حساب المستثمر (اختياري)</label>
              <select name="platform_account_id" className="w-full border rounded px-3 py-2" value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)}>
                <option value="">بدون</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_name} — {a.platform}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">اسم الضيف *</label>
              <input
                name="guest_name"
                required
                className="w-full border rounded px-3 py-2"
                placeholder="اسم الضيف"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
              <input name="phone" className="w-full border rounded px-3 py-2" placeholder="05xxxxxxxx" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الدخول *</label>
              <input type="date" name="checkin_date" required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الخروج *</label>
              <input type="date" name="checkout_date" required className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المصدر / المنصة</label>
              <select name="platform" className="w-full border rounded px-3 py-2">
                <option value="">غير محدد</option>
                <option value="airbnb">Airbnb</option>
                <option value="gathern">Gathern</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">يدوي</option>
                <option value="unknown">غير معروف</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المبلغ *</label>
              <input type="number" step="0.01" name="amount" required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العملة</label>
              <input name="currency" defaultValue="SAR" className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea name="notes" rows={3} className="w-full border rounded px-3 py-2" placeholder="أي ملاحظات..." />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {loading ? "جارٍ الحفظ..." : "حفظ الحجز"}
            </button>
            <Link href="/dashboard/bookings" className="px-4 py-2 border rounded hover:bg-gray-50">
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}



