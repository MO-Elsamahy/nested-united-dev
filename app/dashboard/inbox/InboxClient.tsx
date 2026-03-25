'use client';

import { formatDistanceToNow } from 'date-fns';
import { arSA } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';
import { MessageSquare, RefreshCw, Globe, ExternalLink, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Message {
    id: string;
    platform_account_id: string;
    platform: 'airbnb' | 'gathern';
    thread_id: string;
    account_name: string;
    guest_name: string;
    message_text: string;
    sent_at: string;
    is_read: boolean;
    raw_data: string;
}

export default function InboxClient({ initialMessages }: { initialMessages: any[] }) {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Group messages by thread
    const threads = React.useMemo(() => {
        const map = new Map<string, Message[]>();
        messages.forEach(msg => {
            const key = msg.thread_id || `${msg.platform_account_id}-${msg.guest_name}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(msg); // Notice: we push keeping the original order (DESC)
        });
        return Array.from(map.values()).sort((a, b) => new Date(b[0].sent_at).getTime() - new Date(a[0].sent_at).getTime());
    }, [messages]);

    const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(threads[0] ? (threads[0][0].thread_id || `${threads[0][0].platform_account_id}-${threads[0][0].guest_name}`) : null);
    
    const activeThreadMessages = React.useMemo(() => {
        if (!selectedThreadKey) return [];
        return threads.find(t => {
            const msg = t[0];
            return (msg.thread_id || `${msg.platform_account_id}-${msg.guest_name}`) === selectedThreadKey;
        }) || [];
    }, [threads, selectedThreadKey]);

    const activeThreadLatest = activeThreadMessages[0] || null;

    const [isSyncing, setIsSyncing] = useState(false);

    // Heuristically determine the Host's accountId for Airbnb by finding the ID that appears in the most threads
    const hostIdsByPlatformAccount = React.useMemo(() => {
        const map = new Map<string, string>(); 
        const accounts = new Map<string, Message[]>();
        
        messages.forEach(msg => {
            if (msg.platform === 'airbnb') {
                if (!accounts.has(msg.platform_account_id)) accounts.set(msg.platform_account_id, []);
                accounts.get(msg.platform_account_id)!.push(msg);
            }
        });
        
        accounts.forEach((msgs, pAccountId) => {
            const threadsPerAccount = new Map<string, Set<string>>();
            const freq = new Map<string, number>();
            
            msgs.forEach(m => {
                try {
                    const raw = JSON.parse(m.raw_data);
                    const accId = raw.account?.accountId;
                    if (accId && m.thread_id) {
                        if (!threadsPerAccount.has(accId)) threadsPerAccount.set(accId, new Set());
                        threadsPerAccount.get(accId)!.add(m.thread_id);
                        freq.set(accId, (freq.get(accId) || 0) + 1);
                    }
                } catch {}
            });
            
            let hostId = null;
            let maxThreads = 0;
            threadsPerAccount.forEach((threads, accId) => {
                if (threads.size > maxThreads) {
                    maxThreads = threads.size;
                    hostId = accId;
                }
            });
            
            // Fallback for new accounts with only 1 thread
            if (maxThreads <= 1) {
                 let maxFreq = 0;
                 freq.forEach((f, accId) => {
                     if (f > maxFreq) { maxFreq = f; hostId = accId; }
                 });
            }
            
            if (hostId) map.set(pAccountId, hostId);
        });
        
        return map;
    }, [messages]);

    const isSentByHost = (msg: Message) => {
        try {
            if (!msg.raw_data) return false;
            const raw = JSON.parse(msg.raw_data);
            if (raw.isOpt) return true; // Optimistic logic
            if (msg.platform === 'airbnb') {
                const hostId = hostIdsByPlatformAccount.get(msg.platform_account_id);
                return raw.account?.accountId === hostId;
            } else {
                const lastMsg = raw.last_message || raw.latest_message;
                if (lastMsg) {
                    return lastMsg.sender_id === raw.provider_id || lastMsg.is_me === true;
                }
            }
        } catch { }
        return false;
    };

    useEffect(() => {
        let isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
        if (isElectron) {
            const cleanup = (window as any).electronAPI.onSyncComplete((data: any) => {
                console.log('[Inbox] Sync complete notification, refreshing UI...', data);
                router.refresh();
            });
            return () => { if (cleanup) cleanup(); };
        }
        
        // Fallback polling for web if Electron IPC fails or isn't available
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);
        return () => clearInterval(interval);
    }, [router]);

    const handleManualSync = async () => {
        setIsSyncing(true);
        router.refresh();
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !activeThreadLatest || isSending) return;

        setIsSending(true);
        const textToSend = replyText.trim();
        setReplyText(''); // clear early for UX

        try {
            if (typeof window !== 'undefined' && (window as any).electronAPI) {
                const result = await (window as any).electronAPI.sendMessage({
                    accountId: activeThreadLatest.platform_account_id,
                    platform: activeThreadLatest.platform,
                    threadId: activeThreadLatest.thread_id,
                    text: textToSend,
                    rawPayloadData: activeThreadLatest.raw_data // pass this so backend can extract IDs
                });

                if (result.success) {
                    // Optimistically add message to UI
                    const optimisticMsg: Message = {
                        id: `temp-${Date.now()}`,
                        platform_account_id: activeThreadLatest.platform_account_id,
                        platform: activeThreadLatest.platform,
                        thread_id: activeThreadLatest.thread_id,
                        account_name: activeThreadLatest.account_name,
                        guest_name: activeThreadLatest.guest_name,
                        message_text: textToSend,
                        sent_at: new Date().toISOString(),
                        is_read: true,
                        raw_data: JSON.stringify({ isOpt: true }) // dummy, `isSentByHost` handles fallback
                    };
                    setMessages(prev => [optimisticMsg, ...prev]);
                } else {
                    alert('فشل إرسال الرسالة: ' + (result.error || 'خطأ غير معروف'));
                    setReplyText(textToSend); // Restore text on failure
                }
            }
        } catch (error) {
            console.error('Failed to send:', error);
            alert('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
            setReplyText(textToSend); // Restore text on failure
        } finally {
            setIsSending(false);
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
                    {threads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-300 p-8 text-center bg-gray-50/30">
                            <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-medium text-gray-500">لا توجد رسائل متزامنة بعد.</p>
                            <p className="text-xs mt-1 text-gray-400">سجل الدخول إلى حساباتك لبدء المزامنة.</p>
                        </div>
                    ) : (
                        threads.map((thread) => {
                            const latestMsg = thread[0];
                            const threadKey = latestMsg.thread_id || `${latestMsg.platform_account_id}-${latestMsg.guest_name}`;
                            const isSelected = selectedThreadKey === threadKey;
                            
                            return (
                                <div
                                    key={threadKey}
                                    onClick={() => setSelectedThreadKey(threadKey)}
                                    className={`p-5 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50 ${isSelected ? 'bg-blue-50/50 border-r-4 border-r-blue-600' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${latestMsg.platform === 'airbnb' ? 'bg-[#FF5A5F]' : 'bg-green-500'}`} />
                                            <span className="font-bold text-gray-900">{latestMsg.guest_name || 'ضيف'}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap" suppressHydrationWarning>
                                            {formatDistanceToNow(new Date(latestMsg.sent_at), { addSuffix: true, locale: arSA })}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-gray-500 mb-2 font-medium flex justify-between">
                                        <span>{latestMsg.account_name}</span>
                                        <span className="bg-gray-200 px-1.5 rounded-full">{thread.length} رسالة</span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                        {latestMsg.message_text}
                                    </p>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col bg-[#e5ddd5] bg-opacity-30 relative" style={{ backgroundImage: "url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')", backgroundBlendMode: 'overlay', backgroundSize: '70%', opacity: 0.9 }}>
                {activeThreadLatest ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 bg-[#f0f2f5] flex justify-between items-center shadow-sm z-10 sticky top-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 overflow-hidden">
                                     <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">{activeThreadLatest.guest_name || 'ضيف'}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${activeThreadLatest.platform === 'airbnb' ? 'bg-[#FF5A5F]/10 text-[#FF5A5F]' : 'bg-green-100 text-green-700'
                                            }`}>
                                            {activeThreadLatest.platform === 'airbnb' ? 'Airbnb' : 'Gathern'}
                                        </span>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs text-gray-500 font-medium">{activeThreadLatest.account_name}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    if (typeof window !== 'undefined' && (window as any).electronAPI) {
                                        try {
                                            const result = await (window as any).electronAPI.focusTab(activeThreadLatest.platform_account_id);
                                            if (!result || !result.success) {
                                                await (window as any).electronAPI.openBrowserAccount({
                                                    id: activeThreadLatest.platform_account_id,
                                                    platform: activeThreadLatest.platform,
                                                    accountName: activeThreadLatest.account_name,
                                                    partition: `persist:${activeThreadLatest.platform_account_id}`
                                                });
                                            }
                                        } catch (error) {
                                            console.error('Failed to open platform tab:', error);
                                        }
                                    } else {
                                        const url = activeThreadLatest.platform === 'airbnb' 
                                            ? 'https://www.airbnb.com/hosting/inbox' 
                                            : 'https://business.gathern.co/app/chat';
                                        window.open(url, '_blank');
                                    }
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 transition-all">
                                <span>الرد في المنصة</span>
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 p-6 overflow-y-auto flex flex-col-reverse relative z-0">
                            <div className="max-w-4xl mx-auto w-full space-y-4 flex flex-col justify-end min-h-full pb-4">
                                {activeThreadMessages.slice().reverse().map((msg, idx) => {
                                    const isHost = isSentByHost(msg);
                                    
                                    return (
                                        <div key={msg.id || idx} className={`flex ${isHost ? 'justify-end' : 'justify-start'} w-full`}>
                                            <div className={`max-w-[75%] rounded-2xl p-3 relative shadow-sm ${
                                                isHost 
                                                ? 'bg-[#d9fdd3] rounded-tr-none border border-[#c1e8ba]' 
                                                : 'bg-white rounded-tl-none border border-gray-100'
                                            }`}>
                                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-[15px] font-medium" style={{ wordBreak: 'break-word'}}>
                                                    {msg.message_text}
                                                </p>
                                                <div className={`mt-1 flex items-center justify-end gap-1 ${isHost ? 'text-[#065A4B]' : 'text-gray-400'}`}>
                                                    <span className="text-[10px] font-bold opacity-70" suppressHydrationWarning>
                                                        {new Date(msg.sent_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    {isHost && (
                                                        <svg viewBox="0 0 16 15" width="16" height="15" className="opacity-70 fill-current">
                                                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                <div className="text-center w-full pb-4">
                                     <span className="bg-[#e1f0e5] text-[#1c2e21] text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                                         بداية المحادثة المحفوظة
                                     </span>
                                </div>
                            </div>
                        </div>

                        {/* Reply Composer Area */}
                        <div className="p-4 bg-[#f0f2f5] z-10 sticky bottom-0 border-t border-gray-200">
                            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3 items-end">
                                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden flex items-end min-h-[50px]">
                                    <textarea 
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        placeholder={`اكتب رسالة إلى ${activeThreadLatest.guest_name}...`}
                                        className="w-full bg-transparent border-0 focus:ring-0 resize-none px-4 py-3 pb-3 text-sm text-gray-800 outline-none h-auto max-h-[150px] overflow-y-auto"
                                        rows={1}
                                        style={{ minHeight: '50px' }}
                                        disabled={isSending}
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={!replyText.trim() || isSending}
                                    className="h-[50px] w-[50px] rounded-full flex items-center justify-center bg-[#00a884] hover:bg-[#008f6f] disabled:bg-gray-300 disabled:cursor-not-allowed text-white shadow-md transition-colors flex-shrink-0"
                                >
                                    {isSending ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="24" height="24" className="fill-current transform -translate-x-[2px]">
                                            <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path>
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 relative z-10 p-12">
                        <div className="bg-white/80 backdrop-blur rounded-full p-8 mb-6 shadow-sm">
                            <MessageSquare className="w-16 h-16 opacity-30 text-gray-400" />
                        </div>
                        <h2 className="text-2xl font-light text-gray-600 mb-2">محطة الرسائل המوحدة</h2>
                        <p className="text-sm font-medium text-gray-400 max-w-sm text-center leading-relaxed">
                            اختر محادثة من القائمة لعرض السجل الكامل والتفاعل مع ضيوفك مباشرة
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
