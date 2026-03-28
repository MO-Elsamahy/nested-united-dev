'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, RefreshCw, Send, Search, Wifi,
  CheckCircle2, Clock, Filter, X, User, ShieldCheck
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Message {
  id: string;
  platform_account_id: string;
  platform: 'airbnb' | 'gathern';
  thread_id: string;
  platform_msg_id: string;
  guest_name: string;
  message_text: string;
  is_from_me: number; // 1 if host, 0 if guest
  sent_at: string;
  received_at: string;
  account_name?: string;
  raw_data?: string;
}

interface Account {
  id: string;
  account_name: string;
  platform: 'airbnb' | 'gathern';
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const PLATFORM_COLORS = {
  airbnb: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Airbnb' },
  gathern: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Gathern' },
};

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function ago(dateStr: string): string {
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return 'الآن';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}د`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}س`;
    return `${Math.floor(h / 24)}ي`;
  } catch { return '—'; }
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function InboxClient({ accounts }: { accounts: Account[] }) {
  const [threads, setThreads] = useState<Message[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date>(new Date());
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Data fetching ──────────────────────────

  const fetchThreads = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoadingThreads(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAccount !== 'all') params.set('accountId', filterAccount);

      const res = await fetch(`/api/messages?${params}`);
      const data = await res.json();
      if (data.success) {
        setThreads(data.messages);
        setLastFetch(new Date());
      }
    } catch { /* silent */ } finally {
      if (showLoader) setIsLoadingThreads(false);
    }
  }, [filterAccount]);

  const fetchHistory = useCallback(async (tid: string) => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/messages?threadId=${tid}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.messages);
      }
    } catch { /* silent */ } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchThreads(true);
  }, [fetchThreads]);

  // Auto-refresh threads every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => fetchThreads(false), 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchThreads]);

  // Handle Thread selection
  useEffect(() => {
    if (activeThreadId) {
      fetchHistory(activeThreadId);
    } else {
      setHistory([]);
    }
  }, [activeThreadId, fetchHistory]);

  // Listen for Electron updates (Optimized to prevent storm)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;
    
    const handler = () => {
      // Just trigger a silent thread refresh
      fetchThreads(false);
    };

    api.onPlatformMessagesUpdated?.(handler);
    return () => {
      if (api.offPlatformMessagesUpdated) {
        api.offPlatformMessagesUpdated(handler);
      }
    };
  }, [fetchThreads]); // threads removed to stop infinite loop

  // Scroll to bottom on history change
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // ── Filtering ──────────────────────────────

  const filteredThreads = threads.filter(t => {
    if (filterPlatform !== 'all' && t.platform !== filterPlatform) return false;
    if (filterAccount !== 'all' && t.platform_account_id !== filterAccount) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.guest_name.toLowerCase().includes(q) || t.message_text.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedThread = threads.find(t => t.thread_id === activeThreadId);

  // ── Reply ──────────────────────────────────

  const handleReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    const api = (window as any).electronAPI;
    if (!api) return alert('الرجاء التشغيل عبر Electron');

    // Extract unitId from raw_data if available
    let metadata: any = {};
    const lastMsgWithRaw = [...history].reverse().find(m => m.raw_data);
    if (lastMsgWithRaw?.raw_data) {
      try {
        const raw = JSON.parse(lastMsgWithRaw.raw_data);
        if (raw.unit_id) metadata.unitId = raw.unit_id;
        else if (raw.chalet_id) metadata.unitId = raw.chalet_id;
        
        if (raw.reservation_id) metadata.reservationId = raw.reservation_id;
      } catch (e) { /* ignore */ }
    }

    setIsSending(true);
    try {
      const res = await api.sendMessage({
        accountId: selectedThread.platform_account_id,
        platform: selectedThread.platform,
        threadId: selectedThread.thread_id,
        text: replyText.trim(),
        metadata
      });
      if (res.success) {
        setReplyText('');
        // Trigger immediate sync update
        fetchHistory(selectedThread.thread_id);
        fetchThreads(false);
      } else {
        alert(`فشل الإرسال: ${res.error}`);
      }
    } finally {
      setIsSending(false);
    }
  };

  // ── Render ─────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">
      
      {/* ── Left Sidebar: Conversation List ── */}
      <div className="w-[380px] flex flex-col border-r border-gray-50 bg-gray-50/30">
        
        {/* Header & Search */}
        <div className="p-5 space-y-4 bg-white border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">المحادثات</h2>
            <button onClick={() => fetchThreads(true)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-600">
              <RefreshCw className={`w-5 h-5 ${isLoadingThreads ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن ضيف أو رسالة..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-gray-50 border-none rounded-lg outline-none">
              <option value="all">كل المنصات</option>
              <option value="airbnb">Airbnb</option>
              <option value="gathern">Gathern</option>
            </select>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-gray-50 border-none rounded-lg outline-none">
              <option value="all">كل الحسابات</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingThreads ? (
             <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
          ) : filteredThreads.length === 0 ? (
             <div className="p-10 text-center text-gray-400 space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto opacity-20" />
                <p className="text-sm">لا توجد محادثات مطابقة</p>
             </div>
          ) : (
            filteredThreads.map(t => {
              const p = PLATFORM_COLORS[t.platform];
              const isActive = activeThreadId === t.thread_id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.thread_id)}
                  className={`w-full text-right p-4 transition-all border-b border-gray-50/50 hover:bg-white flex items-start gap-3 ${isActive ? 'bg-white shadow-sm ring-1 ring-black/5 z-10' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold text-lg ${p.bg} ${p.text}`}>
                    {t.guest_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900 truncate text-sm">{t.guest_name}</span>
                      <span className="text-[10px] text-gray-400">{ago(t.sent_at)}</span>
                    </div>
                    <p className={`text-xs truncate ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {t.is_from_me ? <span className="text-blue-500 font-medium">أنا: </span> : ''}
                        {t.message_text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${p.bg} ${p.text}`}>{p.label}</span>
                        <span className="text-[10px] text-gray-400 truncate">{t.account_name}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Interface ── */}
      <div className="flex-1 flex flex-col bg-white">
        {!activeThreadId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 space-y-4">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center">
                <MessageSquare className="w-12 h-12 opacity-20" />
            </div>
            <p className="font-medium">اختر محادثة لبدء المراسلة</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${PLATFORM_COLORS[selectedThread?.platform || 'airbnb'].bg} ${PLATFORM_COLORS[selectedThread?.platform || 'airbnb'].text}`}>
                    {selectedThread?.guest_name[0]}
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{selectedThread?.guest_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold bg-green-50 px-1.5 py-0.5 rounded-full">
                            <Wifi className="w-3 h-3" /> متصل
                        </span>
                        <span className="text-[10px] text-gray-400">{selectedThread?.account_name}</span>
                    </div>
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => fetchHistory(activeThreadId)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                 </button>
                 <button onClick={() => setActiveThreadId(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-4 h-4 text-gray-400" />
                 </button>
              </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 custom-scrollbar">
              {isLoadingHistory && history.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400">جاري تحميل الرسائل...</div>
              ) : (
                history.map((m, idx) => {
                  const isMe = m.is_from_me === 1;
                  const showDate = idx === 0 || new Date(m.sent_at).toDateString() !== new Date(history[idx-1].sent_at).toDateString();
                  
                  return (
                    <div key={m.id} className="space-y-4">
                      {showDate && (
                        <div className="flex justify-center">
                            <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 shadow-sm">
                                {new Date(m.sent_at).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                        </div>
                      )}
                      
                      <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] space-y-1`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                          }`}>
                            {m.message_text}
                          </div>
                          <div className={`flex items-center gap-1 text-[9px] text-gray-400 ${isMe ? 'justify-start' : 'justify-end'}`}>
                            {formatTime(m.sent_at)}
                            {isMe && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-5 border-t border-gray-50 bg-white">
              {selectedThread?.platform === 'airbnb' ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 font-medium">
                    <ShieldCheck className="w-5 h-5 opacity-50" />
                    الرد المباشر لـ Airbnb يتطلب تأكيد الجلسة يدوياً حالياً. استخدم نافذة المتصفح للرد.
                </div>
              ) : (
                <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                    placeholder="اكتب رسالتك للمستأجر..."
                    rows={1}
                    className="flex-1 max-h-32 min-h-[44px] px-4 py-3 bg-transparent border-none outline-none text-sm resize-none"
                  />
                  <button
                    onClick={handleReply}
                    disabled={isSending || !replyText.trim()}
                    className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:grayscale shadow-lg shadow-blue-200"
                  >
                    {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
