'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import { MessageSquare, RefreshCw, Globe, ExternalLink } from 'lucide-react';

interface Message {
    id: string;
    platform: 'airbnb' | 'gathern';
    account_name: string;
    guest_name: string;
    message_text: string;
    sent_at: string;
    is_read: boolean;
}

export default function InboxClient({ initialMessages }: { initialMessages: any[] }) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(initialMessages[0] || null);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
            (window as any).electronAPI.onSyncComplete((data: any) => {
                console.log('[Inbox] Sync complete notification received', data);
            });
        }
    }, []);

    const handleManualSync = async () => {
        if (typeof window === 'undefined' || !(window as any).electronAPI) return;

        setIsSyncing(true);
        try {
            console.log('[Inbox] Triggering manual sync...');
            // In a real scenario, trigger sync for all accounts
        } finally {
            setTimeout(() => setIsSyncing(false), 2000);
        }
    };

    return (
        <div className="flex h-full bg-white divide-x divide-x-reverse divide-gray-100" dir="rtl">
            {/* Sidebar / Message List */}
            <div className="w-1/3 flex flex-col border-l border-gray-100">
                <div className="p-4 flex justify-between items-center bg-gray-50/50 border-b border-gray-100">
                    <span className="text-sm font-bold text-gray-700">المحادثات الأخيرة</span>
                    <button
                        onClick={() => handleManualSync()}
                        disabled={isSyncing}
                        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${isSyncing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 p-8 text-center bg-gray-50/30">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium text-gray-500">لا توجد رسائل متزامنة بعد.</p>
                            <p className="text-xs mt-1 text-gray-400">سجل الدخول إلى حساباتك لبدء المزامنة.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                onClick={() => setSelectedMessage(msg)}
                                className={`p-5 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50 ${selectedMessage?.id === msg.id ? 'bg-blue-50/50 border-r-4 border-r-blue-600' : ''
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${msg.platform === 'airbnb' ? 'bg-[#FF5A5F]' : 'bg-green-500'}`} />
                                        <span className="font-bold text-gray-900">{msg.guest_name || 'ضيف'}</span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {formatDistanceToNow(new Date(msg.sent_at), { addSuffix: true, locale: arSA })}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mb-2 font-medium">
                                    {msg.account_name}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                    {msg.message_text}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col bg-gray-50/20">
                {selectedMessage ? (
                    <>
                        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center shadow-sm z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{selectedMessage.guest_name || 'ضيف'}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${selectedMessage.platform === 'airbnb' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {selectedMessage.platform === 'airbnb' ? 'Airbnb' : 'Gathern'}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-500 font-medium">{selectedMessage.account_name}</span>
                                </div>
                            </div>
                            <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all">
                                <span>فتح في المنصة</span>
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-3xl mx-auto space-y-8">
                                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 relative">
                                    <div className="absolute -top-3 right-6 px-3 py-1 bg-gray-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md">
                                        آخر رسالة
                                    </div>
                                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
                                        {selectedMessage.message_text}
                                    </p>
                                    <div className="mt-6 pt-4 border-t border-gray-50 text-[10px] text-gray-400 flex justify-between font-medium">
                                        <span className="uppercase tracking-widest">تم الاستلام عبر المزامنة المحلية</span>
                                        <span>{new Date(selectedMessage.sent_at).toLocaleString('ar-EG')}</span>
                                    </div>
                                </div>

                                <div className="p-12 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center text-center bg-gray-50/50">
                                    <Globe className="w-12 h-12 text-gray-300 mb-4" />
                                    <h3 className="text-gray-500 font-bold text-lg">سجل المحادثات قادم قريباً</h3>
                                    <p className="text-sm text-gray-400 max-w-sm mt-2 leading-relaxed">
                                        نحن نقوم حالياً بمزامنة أحدث الرسائل. سجل المحادثات الكامل سيكون متاحاً مع مزامنة المزيد من البيانات في التحديثات القادمة.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
                        <MessageSquare className="w-24 h-24 mb-6 opacity-20" />
                        <p className="text-xl font-bold text-gray-500">اختر محادثة لعرض التفاصيل</p>
                    </div>
                )}
            </div>
        </div>
    );
}
