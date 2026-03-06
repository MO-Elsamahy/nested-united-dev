'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Zap, Globe, ShieldCheck } from 'lucide-react';

interface AccountStatus {
    id: string;
    account_name: string;
    platform: 'airbnb' | 'gathern';
    last_sync_at: string | null;
    current_status: 'healthy' | 'expired' | 'error' | null;
    last_error: string | null;
}

export default function StatusClient({ initialAccounts }: { initialAccounts: any[] }) {
    const [accounts, setAccounts] = useState<AccountStatus[]>(initialAccounts);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const handleSync = async (accountId: string) => {
        if (typeof window === 'undefined' || !(window as any).electronAPI) return;

        setSyncingId(accountId);
        try {
            await (window as any).electronAPI.forcePlatformSync(accountId);
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        } catch (err) {
            console.error('Sync failed:', err);
            setSyncingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map((account) => (
                    <div key={account.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.platform === 'airbnb'
                                        ? 'bg-gradient-to-br from-red-500 to-rose-600'
                                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                                        }`}>
                                        <Globe className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg leading-none">{account.account_name}</h3>
                                        <span className="text-xs text-gray-400 mt-1 block uppercase tracking-wider">{account.platform === 'airbnb' ? 'Airbnb' : 'Gathern'}</span>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${account.current_status === 'healthy'
                                    ? 'bg-green-50 border-green-100 text-green-700'
                                    : account.current_status === 'expired'
                                        ? 'bg-amber-50 border-amber-100 text-amber-700'
                                        : 'bg-gray-50 border-gray-100 text-gray-500'
                                    }`}>
                                    {account.current_status === 'healthy' ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">سليم</span>
                                        </>
                                    ) : account.current_status === 'expired' ? (
                                        <>
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">منتهي</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-xs font-bold">قيد الانتظار</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        آخر مزامنة
                                    </span>
                                    <span className="text-gray-900 font-semibold">
                                        {account.last_sync_at
                                            ? formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true, locale: arSA })
                                            : 'أبداً'}
                                    </span>
                                </div>

                                {account.last_error && (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                        <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-1">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            آخر خطأ
                                        </div>
                                        <p className="text-xs text-red-600/80 leading-tight line-clamp-2">{account.last_error}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                            <button
                                onClick={() => handleSync(account.id)}
                                disabled={syncingId === account.id}
                                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 rounded-xl transition-all disabled:opacity-50 font-bold text-sm shadow-sm"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncingId === account.id ? 'animate-spin' : ''}`} />
                                تحقق من سلامة البيانات
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Help/Info Section matching BrowserAccountsPage */}
            <div className="bg-gradient-to-l from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg shadow-blue-500/20">
                <div className="flex items-start gap-6">
                    <div className="bg-white/20 p-4 rounded-2xl">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl mb-3">المزامنة التلقائية</h3>
                        <p className="text-blue-100 leading-relaxed text-sm max-w-2xl">
                            عمليات الخلفية نشطة حالياً لضمان استمرارية استلام بياناتك. يتم استخراج ملفات تعريف الارتباط (cookies) بأمان من جلسة Electron المحلية كل 5 دقائق لضمان تحديث رسائلك وحجوزاتك دون الحاجة للتدخل اليدوي أو إبقاء المتصفح مفتوحاً.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
