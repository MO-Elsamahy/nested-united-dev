'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw,
  Wifi, WifiOff, ExternalLink, Activity, Shield, Zap,
  MessageSquare, Calendar
} from 'lucide-react';

interface AccountStatus {
  id: string;
  account_name: string;
  platform: 'airbnb' | 'gathern';
  session_partition: string;
  last_sync_at: string | null;
  current_status: 'healthy' | 'expired' | 'error' | null;
  last_error: string | null;
  message_count?: number;
}

const PLATFORM_CONFIG = {
  airbnb: {
    label: 'Airbnb',
    gradient: 'from-rose-500 to-red-600',
    lightBg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    badge: 'bg-rose-100 text-rose-700',
    icon: '✈️',
  },
  gathern: {
    label: 'Gathern',
    gradient: 'from-emerald-500 to-green-600',
    lightBg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: '🏡',
  },
};

const STATUS_CONFIG = {
  healthy: {
    label: 'نشط',
    icon: CheckCircle2,
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  expired: {
    label: 'منتهية',
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'خطأ',
    icon: XCircle,
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
  null: {
    label: 'لم يُفحص',
    icon: Clock,
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-500',
    dot: 'bg-gray-400',
  },
};

function formatAgo(dateStr: string | null): string {
  if (!dateStr) return 'لم يتم بعد';
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'منذ لحظات';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${Math.floor(hrs / 24)} يوم`;
  } catch {
    return 'غير معروف';
  }
}

function AccountCard({ account, onSync, onOpen, isSyncing }: {
  account: AccountStatus;
  onSync: (id: string) => void;
  onOpen: (id: string, partition: string, name: string, platform: string) => void;
  isSyncing: boolean;
}) {
  const platform = PLATFORM_CONFIG[account.platform];
  const statusKey = account.current_status ?? 'null';
  const status = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Header bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${platform.gradient}`} />

      <div className="p-5">
        {/* Account info + status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${platform.gradient} flex items-center justify-center text-xl shadow-sm`}>
              {platform.icon}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{account.account_name}</h3>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${platform.badge}`}>
                {platform.label}
              </span>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${status.bg} ${status.border} ${status.text}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} ${statusKey === 'healthy' ? 'animate-pulse' : ''}`} />
            {status.label}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              آخر مزامنة
            </div>
            <p className="text-gray-800 text-sm font-semibold truncate">{formatAgo(account.last_sync_at)}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
              <MessageSquare className="w-3.5 h-3.5" />
              الرسائل
            </div>
            <p className="text-gray-800 text-sm font-semibold">
              {account.message_count != null ? `${account.message_count} رسالة` : '—'}
            </p>
          </div>
        </div>

        {/* Error display */}
        {account.last_error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-600 font-medium leading-relaxed line-clamp-2">
              ⚠️ {account.last_error}
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onSync(account.id)}
            disabled={isSyncing}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all
              ${isSyncing
                ? 'bg-blue-50 border-blue-200 text-blue-500 opacity-70 cursor-not-allowed'
                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'جارٍ...' : 'مزامنة'}
          </button>

          <button
            onClick={() => onOpen(account.id, account.session_partition, account.account_name, account.platform)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all
              bg-white border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح المتصفح
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsBar({ accounts }: { accounts: AccountStatus[] }) {
  const healthy = accounts.filter(a => a.current_status === 'healthy').length;
  const expired = accounts.filter(a => a.current_status === 'expired').length;
  const errors = accounts.filter(a => a.current_status === 'error').length;
  const pending = accounts.filter(a => !a.current_status).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'نشطة', value: healthy, icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-100' },
        { label: 'منتهية', value: expired, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-100' },
        { label: 'أخطاء', value: errors, icon: XCircle, color: 'text-red-600 bg-red-50 border-red-100' },
        { label: 'لم يُفحص', value: pending, icon: Clock, color: 'text-gray-500 bg-gray-50 border-gray-100' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
          <Icon className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-2xl font-black leading-none">{value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-75">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatusClient({ initialAccounts }: { initialAccounts: AccountStatus[] }) {
  const [accounts, setAccounts] = useState<AccountStatus[]>(initialAccounts);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electronAPI);
  }, []);

  const refreshCounts = useCallback(async () => {
    // Refresh message counts from Electron
    if (!(window as any).electronAPI) return;
    try {
      const res = await (window as any).electronAPI.getPlatformMessages?.({});
      if (res?.success && res.messages) {
        const counts: Record<string, number> = {};
        for (const msg of res.messages) {
          counts[msg.platform_account_id] = (counts[msg.platform_account_id] || 0) + 1;
        }
        setAccounts(prev => prev.map(a => ({ ...a, message_count: counts[a.id] || 0 })));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  const handleSync = async (accountId: string) => {
    if (!(window as any)?.electronAPI) return;
    setSyncingIds(prev => new Set(prev).add(accountId));
    try {
      await (window as any).electronAPI.forcePlatformSync(accountId);
      setLastRefresh(new Date());
      await refreshCounts();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingIds(prev => { const s = new Set(prev); s.delete(accountId); return s; });
    }
  };

  const handleOpen = (id: string, partition: string, name: string, platform: string) => {
    if (!(window as any)?.electronAPI) return;
    (window as any).electronAPI.openBrowserAccount({ id, platform, accountName: name, partition });
  };

  const handleSyncAll = async () => {
    for (const acc of accounts) {
      await handleSync(acc.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">حالة الجلسات</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            آخر تحديث: {formatAgo(lastRefresh.toISOString())}
          </p>
        </div>
        <button
          onClick={handleSyncAll}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
        >
          <Zap className="w-4 h-4" />
          مزامنة الكل
        </button>
      </div>

      {/* Stats */}
      <StatsBar accounts={accounts} />

      {/* Accounts grid */}
      {accounts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-semibold">لا توجد حسابات مسجّلة</p>
          <p className="text-sm mt-1">أضف حسابات من صفحة الحسابات أولاً</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onSync={handleSync}
              onOpen={handleOpen}
              isSyncing={syncingIds.has(account.id)}
            />
          ))}
        </div>
      )}

      {/* Info banner */}
      {!isElectron && (
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">وضع المتصفح فقط</p>
            <p className="text-xs text-amber-700 mt-0.5">
              عمليات المزامنة والفتح تتطلب تشغيل التطبيق عبر Electron
            </p>
          </div>
        </div>
      )}

      {/* Background sync info */}
      <div className="flex items-start gap-4 p-5 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-500/20">
        <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base">المزامنة التلقائية نشطة</h3>
          <p className="text-blue-100 text-sm mt-1 leading-relaxed">
            الـ polling service يعمل في الخلفية كل 30 ثانية لسحب الرسائل تلقائياً باستخدام cookies الـ session من Electron — بدون الحاجة لفتح المتصفح.
          </p>
        </div>
      </div>
    </div>
  );
}
