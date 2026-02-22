"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Save, Loader2 } from "lucide-react";

interface UnitOption {
  id: string;
  unit_name: string;
  unit_code: string | null;
}

interface AccountOption {
  id: string;
  account_name: string;
  platform: string;
}

interface ReservationData {
  id: string;
  unit_id: string;
  platform: string;
  start_date: string;
  end_date: string;
  summary: string | null;
  unit?: {
    id: string;
    unit_name: string;
    platform_account_id: string | null;
  } | null;
}

export default function ConvertReservationPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = use(params instanceof Promise ? params : Promise.resolve(params));
  const router = useRouter();
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationData | null>(null);

  useEffect(() => {
    // Load units and accounts
    Promise.all([
      fetch("/api/units").then((r) => r.json()).then((data) => setUnits(data || [])).catch(() => setUnits([])),
      fetch("/api/accounts").then((r) => r.json()).then((data) => setAccounts(data || [])).catch(() => setAccounts([])),
    ]);

    // Load reservation data
    fetch(`/api/reservations/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setReservation(data);
        }
      })
      .catch(() => setError("فشل تحميل بيانات الحجز"))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reservation) return;

    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      unit_id: form.get("unit_id") || reservation.unit_id,
      platform_account_id: form.get("platform_account_id") || reservation.unit?.platform_account_id || null,
      platform: form.get("platform") || reservation.platform,
      guest_name: form.get("guest_name") || reservation.summary || "حجز من iCal",
      phone: form.get("phone") || null,
      checkin_date: form.get("checkin_date") || reservation.start_date,
      checkout_date: form.get("checkout_date") || reservation.end_date,
      amount: form.get("amount") ? Number(form.get("amount")) : null,
      currency: form.get("currency") || "SAR",
      notes: form.get("notes") || reservation.summary || null,
    };

    try {
      // Create booking
      const createRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const createResult = await createRes.json().catch(() => ({}));
      if (!createRes.ok) throw new Error(createResult.error || "فشل إنشاء الحجز");

      // Delete original reservation
      const deleteRes = await fetch(`/api/reservations/${resolvedParams.id}`, {
        method: "DELETE",
      });
      if (!deleteRes.ok) {
        console.warn("Failed to delete original reservation, but booking was created");
      }

      router.push("/dashboard/bookings");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "فشل تحويل الحجز");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 mb-4">{error}</p>
          <Link href="/dashboard/bookings" className="text-blue-600 hover:underline">
            العودة للحجوزات
          </Link>
        </div>
      </div>
    );
  }

  if (!reservation) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/bookings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تحويل وتعديل حجز من iCal</h1>
          <p className="text-gray-600 text-sm">تحويل حجز iCal إلى حجز يدوي مع إضافة البيانات الناقصة</p>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium mb-1">هذا الحجز من iCal ويحتاج إلى إضافة البيانات</p>
            <p className="text-yellow-700 text-sm">سيتم تحويله إلى حجز يدوي بعد الحفظ وسيتم حذف الحجز الأصلي من iCal</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">الوحدة *</label>
              <select name="unit_id" required className="w-full border rounded px-3 py-2" defaultValue={reservation.unit_id}>
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
              <select name="platform_account_id" className="w-full border rounded px-3 py-2" defaultValue={reservation.unit?.platform_account_id || ""}>
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
                defaultValue={reservation.summary || "حجز من iCal"}
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
              <input type="date" name="checkin_date" required className="w-full border rounded px-3 py-2" defaultValue={reservation.start_date} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الخروج *</label>
              <input type="date" name="checkout_date" required className="w-full border rounded px-3 py-2" defaultValue={reservation.end_date} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المصدر / المنصة</label>
              <select name="platform" className="w-full border rounded px-3 py-2" defaultValue={reservation.platform || ""}>
                <option value="">غير محدد</option>
                <option value="airbnb">Airbnb</option>
                <option value="gathern">Gathern</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="manual">Manual</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">المبلغ</label>
              <input type="number" step="0.01" name="amount" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العملة</label>
              <input name="currency" defaultValue="SAR" className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea name="notes" rows={3} className="w-full border rounded px-3 py-2" placeholder="أي ملاحظات..." defaultValue={reservation.summary || ""} />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جارٍ التحويل...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  تحويل وحفظ
                </>
              )}
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

