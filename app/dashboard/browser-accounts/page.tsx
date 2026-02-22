import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Globe, Plus, Bell, BellOff, ExternalLink, Monitor, Wifi, WifiOff } from "lucide-react";
import Link from "next/link";
import { DeleteBrowserAccountButton } from "./DeleteBrowserAccountButton";
import { OpenAccountButton } from "./OpenAccountButton";
import { TestNotificationButton } from "./TestNotificationButton";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/server-permissions";
import { BrowserAccountsPageClient } from "./BrowserAccountsPageClient";

async function getBrowserAccounts() {
  try {
    const accounts = await query<any>(
      "SELECT * FROM browser_accounts ORDER BY created_at DESC"
    );
    return accounts || [];
  } catch (error) {
    console.error("[BrowserAccounts] Error:", error);
    return [];
  }
}

export default async function BrowserAccountsPage() {
  const accounts = await getBrowserAccounts();
  const canEdit = await hasPermission("/dashboard/browser-accounts", "edit");

  const airbnbAccounts = accounts.filter(a => a.platform === "airbnb");
  const gathernAccounts = accounts.filter(a => a.platform === "gathern");
  const whatsappAccounts = accounts.filter(a => a.platform === "whatsapp");
  const withNotifications = accounts.filter(a => a.has_unread_notifications);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">حسابات المتصفح</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            مراقبة إشعارات Airbnb و Gathern و WhatsApp في الوقت الفعلي
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
          <TestNotificationButton />
          {canEdit ? (
            <Link
              href="/dashboard/browser-accounts/new"
              className="flex items-center gap-2 bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة حساب</span>
            </Link>
          ) : (
            <BrowserAccountsPageClient />
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إجمالي الحسابات</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{accounts.length}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Monitor className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Airbnb</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{airbnbAccounts.length}</p>
            </div>
            <div className="bg-red-50 p-3 rounded-xl">
              <Globe className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Gathern</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{gathernAccounts.length}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <Globe className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">WhatsApp</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{whatsappAccounts.length}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl">
              <Globe className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">إشعارات جديدة</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{withNotifications.length}</p>
            </div>
            <div className={`p-3 rounded-xl ${withNotifications.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
              <Bell className={`w-6 h-6 ${withNotifications.length > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List */}
      {accounts.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 bg-gray-50/50">
            <h2 className="font-semibold text-gray-900">جميع الحسابات</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`p-5 hover:bg-gray-50/50 transition-colors ${account.has_unread_notifications ? 'bg-red-50/30' : ''
                  }`}
              >
                <div className="flex items-center justify-between">
                  {/* Account Info */}
                  <div className="flex items-center gap-4">
                    {/* Platform Icon */}
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${account.platform === 'airbnb'
                      ? 'bg-gradient-to-br from-red-500 to-rose-600'
                      : account.platform === 'gathern'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-emerald-500 to-green-600'
                      }`}>
                      <Globe className="w-7 h-7 text-white" />
                      {account.has_unread_notifications && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </div>

                    {/* Details */}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {account.account_name}
                        </h3>
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${account.platform === 'airbnb'
                          ? 'bg-red-100 text-red-700'
                          : account.platform === 'gathern'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {account.platform === 'airbnb'
                            ? 'Airbnb'
                            : account.platform === 'gathern'
                              ? 'Gathern'
                              : 'WhatsApp'}
                        </span>
                        {account.has_unread_notifications && (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            إشعار جديد
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {account.account_email && (
                          <span>{account.account_email}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5" />
                          آخر إشعار: {account.last_notification_at
                            ? new Date(account.last_notification_at).toLocaleString('ar-EG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : 'لا يوجد'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${account.is_active
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                      }`}>
                      {account.is_active ? (
                        <>
                          <Wifi className="w-4 h-4" />
                          <span>نشط</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-4 h-4" />
                          <span>غير نشط</span>
                        </>
                      )}
                    </div>

                    <OpenAccountButton
                      accountId={account.id}
                      accountName={account.account_name}
                      platform={account.platform}
                      partition={account.session_partition}
                    />
                    {canEdit && (
                      <DeleteBrowserAccountButton
                        accountId={account.id}
                        accountName={account.account_name}
                      />
                    )}
                  </div>
                </div>

                {account.notes && (
                  <p className="text-gray-600 text-sm mt-3 mr-18 bg-gray-50 rounded-lg p-3">
                    {account.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
          <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Monitor className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            لا توجد حسابات متصفح
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            أضف حسابات Airbnb و Gathern و WhatsApp لمراقبة الإشعارات والرسائل الجديدة في الوقت الفعلي
          </p>
          <Link
            href="/dashboard/browser-accounts/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة أول حساب</span>
          </Link>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 p-3 rounded-xl">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">كيف يعمل نظام مراقبة الإشعارات؟</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-100 text-sm">
              <div className="flex items-start gap-2">
                <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>أضف حساب المتصفح وربطه بحساب المنصة</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>افتح البرنامج وسجل الدخول مرة واحدة</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>البرنامج يراقب الإشعارات تلقائيًا</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
                <span>تنبيه صوتي فوري عند رسالة جديدة</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
