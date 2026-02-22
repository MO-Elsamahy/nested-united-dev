"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, Monitor, Globe, CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePermission } from "@/lib/hooks/usePermission";

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string;
}

export default function NewBrowserAccountPage() {
  const router = useRouter();
  const canEdit = usePermission("edit");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [mode, setMode] = useState<"platform" | "whatsapp">("platform");

  useEffect(() => {
    if (canEdit === false) {
      router.push("/dashboard/browser-accounts?error=no_permission");
    }
  }, [canEdit, router]);

  useEffect(() => {
    // Fetch only unlinked platform accounts (not already connected to a browser account)
    fetch("/api/accounts/unlinked")
      .then((res) => res.json())
      .then((data) => {
        setPlatformAccounts(data);
        setLoadingAccounts(false);
      })
      .catch(() => {
        setLoadingAccounts(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    let payload: any = {
      account_email: formData.get("account_email") || null,
      notes: formData.get("notes") || null,
    };

    if (mode === "whatsapp") {
      payload = {
        ...payload,
        platform: "whatsapp",
        platform_account_id: null,
        account_name: (formData.get("account_name") as string) || "WhatsApp",
      };
    } else {
      const platformAccountId = formData.get("platform_account_id") as string;
      const selectedAccount = platformAccounts.find((a) => a.id === platformAccountId);

      if (!selectedAccount) {
        setError("يرجى اختيار حساب منصة");
        setLoading(false);
        return;
      }

      payload = {
        ...payload,
        platform: selectedAccount.platform,
        platform_account_id: platformAccountId,
        account_name: selectedAccount.account_name,
      };
    }

    try {
      const response = await fetch("/api/browser-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        router.push("/dashboard/browser-accounts");
        router.refresh();
      } else {
        const result = await response.json();
        setError(result.error || "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const airbnbAccounts = platformAccounts.filter((a) => a.platform === "airbnb");
  const gathernAccounts = platformAccounts.filter((a) => a.platform === "gathern");

  if (canEdit === null) {
    return <div className="text-center py-12">جاري التحميل...</div>;
  }

  if (canEdit === false) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          <p className="font-semibold mb-2">ليس لديك صلاحية لإضافة حسابات المتصفح</p>
          <Link href="/dashboard/browser-accounts" className="text-blue-600 hover:underline">
            العودة لحسابات المتصفح
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/dashboard/browser-accounts" 
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <ArrowRight className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">إضافة حساب متصفح</h1>
          <p className="text-gray-500 mt-1">ربط حساب منصة بمتصفح لمراقبة الإشعارات</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {platformAccounts.length === 0 && !loadingAccounts ? (
          <div className="p-12 text-center">
            <div className="bg-yellow-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              لا توجد حسابات منصات متاحة
            </h3>
            <p className="text-gray-500 mb-6">
              جميع حسابات المنصات مرتبطة بالفعل بحسابات متصفح،
              <br />
              أو لا توجد حسابات منصات أصلاً.
            </p>
            <Link
              href="/dashboard/accounts/new"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
            >
              إضافة حساب منصة جديد
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* Mode toggle */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setMode("platform")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    mode === "platform"
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  ربط حساب منصة (Airbnb / Gathern)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("whatsapp")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    mode === "whatsapp"
                      ? "bg-emerald-600 text-white shadow"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  إضافة واتساب بدون ربط
                </button>
              </div>

              {/* Platform Account Selection */}
              {mode === "platform" ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    اختر حساب المنصة
                  </label>
                  
                  {loadingAccounts ? (
                    <div className="h-32 flex items-center justify-center text-gray-400">
                      جاري التحميل...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {/* Airbnb Accounts */}
                      {airbnbAccounts.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                            Airbnb
                          </p>
                          <div className="space-y-2">
                            {airbnbAccounts.map((account) => (
                              <label
                                key={account.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  selectedPlatform === account.id
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-200 hover:border-red-200 hover:bg-red-50/50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="platform_account_id"
                                  value={account.id}
                                  className="hidden"
                                  onChange={() => setSelectedPlatform(account.id)}
                                />
                                <div className="bg-gradient-to-br from-red-500 to-rose-600 w-10 h-10 rounded-xl flex items-center justify-center">
                                  <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{account.account_name}</p>
                                  <p className="text-sm text-gray-500">Airbnb</p>
                                </div>
                                {selectedPlatform === account.id && (
                                  <CheckCircle2 className="w-6 h-6 text-red-500" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Gathern Accounts */}
                      {gathernAccounts.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                            Gathern
                          </p>
                          <div className="space-y-2">
                            {gathernAccounts.map((account) => (
                              <label
                                key={account.id}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                  selectedPlatform === account.id
                                    ? 'border-green-500 bg-green-50'
                                    : 'border-gray-200 hover:border-green-200 hover:bg-green-50/50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="platform_account_id"
                                  value={account.id}
                                  className="hidden"
                                  onChange={() => setSelectedPlatform(account.id)}
                                />
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-10 h-10 rounded-xl flex items-center justify-center">
                                  <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{account.account_name}</p>
                                  <p className="text-sm text-gray-500">Gathern</p>
                                </div>
                                {selectedPlatform === account.id && (
                                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                                )}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    اسم حساب واتساب (اختياري)
                  </label>
                  <input
                    type="text"
                    name="account_name"
                    placeholder="مثال: واتساب الاستقبال"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500">
                    واتساب لا يتطلب ربط بحساب منصة. سيتم إنشاء partition مستقل تلقائياً.
                  </p>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  البريد الإلكتروني للحساب
                  <span className="text-gray-400 font-normal mr-2">(اختياري)</span>
                </label>
                <input
                  type="email"
                  name="account_email"
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-gray-400 text-xs mt-1.5">
                  البريد المستخدم لتسجيل الدخول في المنصة
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ملاحظات
                  <span className="text-gray-400 font-normal mr-2">(اختياري)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>

            {/* How it works */}
            <div className="bg-gradient-to-l from-blue-50 to-indigo-50 border-t border-blue-100 px-6 py-5">
              <div className="flex items-start gap-3">
                <Monitor className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900 text-sm">الخطوة التالية</p>
                  <p className="text-blue-700 text-sm mt-1">
                    بعد الإضافة، افتح البرنامج Desktop واضغط &quot;فتح&quot; على الحساب، ثم سجل دخول مرة واحدة.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                type="submit"
                disabled={
                  loading ||
                  loadingAccounts ||
                  (mode === "platform" && !selectedPlatform)
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-medium transition-colors"
              >
                {loading ? "جاري الإضافة..." : "إضافة حساب المتصفح"}
              </button>
              <Link
                href="/dashboard/browser-accounts"
                className="px-6 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 text-center transition-colors"
              >
                إلغاء
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
