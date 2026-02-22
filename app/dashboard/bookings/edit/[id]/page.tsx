"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertCircle, Save, Loader2 } from "lucide-react";
import { usePermission } from "@/lib/hooks/usePermission";

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

interface BookingData {
  id: string;
  unit_id: string;
  platform_account_id: string | null;
  platform: string | null;
  guest_name: string;
  phone: string | null;
  checkin_date: string;
  checkout_date: string;
  amount: number | null;
  currency: string | null;
  notes: string | null;
}

export default function EditBookingPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = use(params instanceof Promise ? params : Promise.resolve(params));
  const router = useRouter();
  // Check edit permission specifically for bookings page
  const canEdit = usePermission("edit", "/dashboard/bookings");
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);

  useEffect(() => {
    if (canEdit === false) {
      router.push("/dashboard/bookings?error=no_permission");
    }
  }, [canEdit, router]);

  useEffect(() => {
    // Load units and accounts
    Promise.all([
      fetch("/api/units").then((r) => r.json()).then((data) => setUnits(data || [])).catch(() => setUnits([])),
      fetch("/api/accounts").then((r) => r.json()).then((data) => setAccounts(data || [])).catch(() => setAccounts([])),
    ]);

    // Load booking data
    fetch(`/api/bookings/${resolvedParams.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setBooking(data);
        }
      })
      .catch(() => setError("فشل تحميل بيانات الحجز"))
      .finally(() => setLoading(false));
  }, [resolvedParams.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!booking) return;

    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      unit_id: form.get("unit_id"),
      platform_account_id: form.get("platform_account_id") || null,
      platform: form.get("platform") || null,
      guest_name: form.get("guest_name"),
      phone: form.get("phone") || null,
      checkin_date: form.get("checkin_date"),
      checkout_date: form.get("checkout_date"),
      amount: form.get("amount") ? Number(form.get("amount")) : null,
      currency: form.get("currency") || "SAR",
      notes: form.get("notes") || null,
    };

    try {
      const res = await fetch(`/api/bookings/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "فشل تحديث الحجز");
      router.push("/dashboard/bookings");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "فشل تحديث الحجز");
    } finally {
      setSaving(false);
    }
  };

  if (canEdit === null || loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (canEdit === false) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          <p className="font-semibold mb-2">ليس لديك صلاحية لتعديل الحجوزات</p>
          <Link href="/dashboard/bookings" className="text-blue-600 hover:underline">
            العودة للحجوزات
          </Link>
        </div>
      </div>
    );
  }

  if (error && !booking) {
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

  if (!booking) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/bookings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowRight className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">تعديل الحجز</h1>
          <p className="text-gray-600 text-sm">تعديل بيانات الحجز</p>
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
              <select name="unit_id" required className="w-full border rounded px-3 py-2" defaultValue={booking.unit_id}>
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
              <select name="platform_account_id" className="w-full border rounded px-3 py-2" defaultValue={booking.platform_account_id || ""}>
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
                defaultValue={booking.guest_name}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
              <input name="phone" className="w-full border rounded px-3 py-2" placeholder="05xxxxxxxx" defaultValue={booking.phone || ""} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الدخول *</label>
              <input type="date" name="checkin_date" required className="w-full border rounded px-3 py-2" defaultValue={booking.checkin_date} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">تاريخ الخروج *</label>
              <input type="date" name="checkout_date" required className="w-full border rounded px-3 py-2" defaultValue={booking.checkout_date} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">المصدر / المنصة</label>
              <select name="platform" className="w-full border rounded px-3 py-2" defaultValue={booking.platform || ""}>
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
              <input type="number" step="0.01" name="amount" className="w-full border rounded px-3 py-2" defaultValue={booking.amount || ""} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">العملة</label>
              <input name="currency" defaultValue={booking.currency || "SAR"} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات</label>
            <textarea name="notes" rows={3} className="w-full border rounded px-3 py-2" placeholder="أي ملاحظات..." defaultValue={booking.notes || ""} />
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
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  حفظ التعديلات
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

