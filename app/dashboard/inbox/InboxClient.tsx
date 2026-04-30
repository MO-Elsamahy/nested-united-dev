'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, RefreshCw, Send, Search,
  CheckCircle2, X, Wifi, WifiOff, AlertCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Message {
  id:                 string;
  platform_account_id: string;
  platform:           'airbnb' | 'gathern';
  thread_id:          string;
  platform_msg_id:    string;
  guest_name:         string;
  message_text:       string;
  is_from_me:         number;
  sent_at:            string;
  received_at:        string;
  account_name?:      string;
  raw_data?:          string;
}

interface Account {
  id:           string;
  account_name: string;
  platform:     'airbnb' | 'gathern';
}

interface SessionHealth {
  browser_account_id: string;
  platform:           string;
  status:             'healthy' | 'expired' | 'error' | 'unknown';
  error_message?:     string | null;
  checked_at?:        string | null;
  account_name?:      string;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PLATFORM_COLORS = {
  airbnb:  { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'Airbnb'  },
  gathern: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Gathern' },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatTime(dateStr: string): string {
  try { return new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function ago(dateStr: string): string {
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const s  = Math.floor(ms / 1000);
    if (s < 60)   return 'الآن';
    const m = Math.floor(s / 60);
    if (m < 60)   return `${m}د`;
    const h = Math.floor(m / 60);
    if (h < 24)   return `${h}س`;
    return `${Math.floor(h / 24)}ي`;
  } catch { return '—'; }
}

// ─────────────────────────────────────────────
// Session health indicator
// ─────────────────────────────────────────────

function HealthDot({ status }: { status: SessionHealth['status'] }) {
  if (status === 'healthy') return (
    <span title="الجلسة نشطة" className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]" />
  );
  if (status === 'unknown') return (
    <span title="لم يتم التحقق بعد" className="inline-block w-2 h-2 rounded-full bg-gray-300" />
  );
  return (
    <span title="الجلسة منتهية — يرجى فتح النافذة" className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function InboxClient({ accounts }: { accounts: Account[] }) {
  const [threads,          setThreads]          = useState<Message[]>([]);
  const [activeThreadId,   setActiveThreadId]   = useState<string | null>(null);
  const [history,          setHistory]          = useState<Message[]>([]);
  const [search,           setSearch]           = useState('');
  const [filterAccount,    setFilterAccount]    = useState<string>('all');
  const [filterPlatform,   setFilterPlatform]   = useState<string>('all');
  const [replyText,        setReplyText]        = useState('');
  const [isSending,        setIsSending]        = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [lastFetch,        setLastFetch]        = useState<Date>(new Date());
  const [healthMap,        setHealthMap]        = useState<Map<string, SessionHealth['status']>>(new Map());
  const [sendError,        setSendError]        = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<NodeJS.Timeout | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchThreads = useCallback(async (showLoader = false) => {
    if (showLoader) setIsLoadingThreads(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filterAccount !== 'all')  params.set('accountId', filterAccount);
      if (filterPlatform !== 'all') params.set('platform',  filterPlatform);

      const res  = await fetch(`/api/messages?${params}`);
      const data = await res.json();
      if (data.success) {
        setThreads(data.messages);
        setLastFetch(new Date());
      }
    } catch { /* silent */ } finally {
      if (showLoader) setIsLoadingThreads(false);
    }
  }, [filterAccount, filterPlatform]);

  const fetchHistory = useCallback(async (tid: string) => {
    setIsLoadingHistory(true);
    try {
      const params: Record<string, string> = { threadId: tid };
      if (filterAccount !== 'all') params.accountId = filterAccount;

      const res  = await fetch(`/api/messages?${new URLSearchParams(params)}`);
      const data = await res.json();
      if (data.success) setHistory(data.messages);
    } catch { /* silent */ } finally {
      setIsLoadingHistory(false);
    }
  }, [filterAccount]);

  const fetchHealth = useCallback(async () => {
    try {
      const res  = await fetch('/api/sessions/health');
      const data = await res.json();
      if (data.success) {
        const m = new Map<string, SessionHealth['status']>();
        (data.health as SessionHealth[]).forEach(h => m.set(h.browser_account_id, h.status));
        setHealthMap(m);
      }
    } catch { /* silent */ }
  }, []);

  // Initial load
  useEffect(() => {
    fetchThreads(true);
    fetchHealth();
  }, [fetchThreads, fetchHealth]);

  // Auto-refresh threads every 5 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchThreads(false);
    }, 5_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchThreads]);

  // Refresh health every 30 seconds
  useEffect(() => {
    const t = setInterval(() => fetchHealth(), 30_000);
    return () => clearInterval(t);
  }, [fetchHealth]);

  // Thread selection → load history
  useEffect(() => {
    if (activeThreadId) {
      fetchHistory(activeThreadId);
      setSendError(null);
    } else {
      setHistory([]);
    }
  }, [activeThreadId, fetchHistory]);

  // While a thread is open, refresh its history every 5 seconds to keep
  // inbound/outbound message state fresh even if no push event arrives.
  useEffect(() => {
    if (!activeThreadId) return;
    const t = setInterval(() => fetchHistory(activeThreadId), 5_000);
    return () => clearInterval(t);
  }, [activeThreadId, fetchHistory]);

  // Listen for Electron new-messages push event
  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { onPlatformMessagesUpdated?: (h: () => void) => void; offPlatformMessagesUpdated?: (h: () => void) => void } }).electronAPI;
    if (!api) return;
    const handler = () => {
      fetchThreads(false);
      if (activeThreadId) void fetchHistory(activeThreadId);
    };
    api.onPlatformMessagesUpdated?.(handler);
    return () => api.offPlatformMessagesUpdated?.(handler);
  }, [fetchThreads, fetchHistory, activeThreadId]);

  // Listen for session health changes from Electron
  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { onSessionHealthChanged?: (h: (p: { accountId: string; healthy: boolean }) => void) => void; offSessionHealthChanged?: (h: (p: { accountId: string; healthy: boolean }) => void) => void } }).electronAPI;
    if (!api?.onSessionHealthChanged) return;
    const handler = ({ accountId, healthy }: { accountId: string; healthy: boolean }) => {
      setHealthMap(prev => {
        const next = new Map(prev);
        next.set(accountId, healthy ? 'healthy' : 'expired');
        return next;
      });
    };
    api.onSessionHealthChanged(handler);
    return () => api.offSessionHealthChanged?.(handler);
  }, []);

  // Scroll to bottom on new history
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Mark thread as read when opened
  useEffect(() => {
    if (!activeThreadId) return;
    const thread = threads.find(t => t.thread_id === activeThreadId);
    if (thread) {
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          browserAccountId: thread.platform_account_id,
        }),
      }).catch(() => {/* non-critical */});
    }
  }, [activeThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredThreads = threads.filter(t => {
    if (filterPlatform !== 'all' && t.platform !== filterPlatform) return false;
    if (filterAccount  !== 'all' && t.platform_account_id !== filterAccount) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.guest_name.toLowerCase().includes(q) || t.message_text.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedThread = threads.find(t => t.thread_id === activeThreadId);

  // ── Reply ──────────────────────────────────────────────────────────────────

  const handleReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    const api = (window as unknown as { electronAPI?: { sendMessage: (p: { accountId: string; platform: string; threadId: string; text: string; metadata: Record<string, unknown> }) => Promise<{ success: boolean; error?: string }> } }).electronAPI;
    if (!api) return alert('الرجاء التشغيل عبر تطبيق Electron');

    setSendError(null);

    // Extract unit_id from raw_data if available (used by Gathern send)
    const metadata: Record<string, unknown> = {};
    const lastMsgWithRaw = [...history].reverse().find(m => m.raw_data);
    if (lastMsgWithRaw?.raw_data) {
      try {
        const raw = JSON.parse(lastMsgWithRaw.raw_data);
        if (raw.unit_id)    metadata.unitId       = raw.unit_id;
        if (raw.chalet_id)  metadata.unitId       = metadata.unitId || raw.chalet_id;
        if (raw.reservation_id) metadata.reservationId = raw.reservation_id;
      } catch { /* ignore */ }
    }

    setIsSending(true);
    try {
      const res = await api.sendMessage({
        accountId: selectedThread.platform_account_id,
        platform:  selectedThread.platform,
        threadId:  selectedThread.thread_id,
        text:      replyText.trim(),
        metadata,
      });

      if (res.success) {
        setReplyText('');
        // Immediate refresh of thread history to show sent message
        await fetchHistory(selectedThread.thread_id);
        fetchThreads(false);
      } else {
        setSendError(res.error || 'فشل الإرسال');
      }
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : 'فشل الإرسال');
    } finally {
      setIsSending(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden">

      {/* ── Left Sidebar: Thread List ── */}
      <div className="w-[380px] flex flex-col border-r border-gray-50 bg-gray-50/30">

        {/* Header & Search */}
        <div className="p-5 space-y-4 bg-white border-b border-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">المحادثات</h2>
            <button
              onClick={() => { fetchThreads(true); fetchHealth(); }}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-blue-600"
              title="تحديث"
            >
              <RefreshCw className={`w-5 h-5 ${isLoadingThreads ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن ضيف أو رسالة..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterPlatform}
              onChange={e => { setFilterPlatform(e.target.value); }}
              className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-gray-50 border-none rounded-lg outline-none"
            >
              <option value="all">كل المنصات</option>
              <option value="airbnb">Airbnb</option>
              <option value="gathern">Gathern</option>
            </select>
            <select
              value={filterAccount}
              onChange={e => { setFilterAccount(e.target.value); }}
              className="flex-1 text-[11px] font-bold py-1.5 px-2 bg-gray-50 border-none rounded-lg outline-none"
            >
              <option value="all">كل الحسابات</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.account_name}
                </option>
              ))}
            </select>
          </div>

          {/* Session health row */}
          {accounts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {accounts.map(a => {
                const status = healthMap.get(a.id) || 'unknown';
                return (
                  <div key={a.id} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <HealthDot status={status} />
                    <span className="truncate max-w-[80px]">{a.account_name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoadingThreads ? (
            <div className="p-10 text-center text-gray-400">جاري التحميل...</div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-10 text-center text-gray-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm">لا توجد محادثات مطابقة</p>
              <p className="text-xs text-gray-300">
                {accounts.length === 0
                  ? 'أضف حسابًا من صفحة حسابات المتصفح'
                  : 'يتم سحب الرسائل تلقائياً كل 5 ثوانٍ'}
              </p>
            </div>
          ) : (
            filteredThreads.map(t => {
              const p = PLATFORM_COLORS[t.platform] || PLATFORM_COLORS.airbnb;
              const isActive = activeThreadId === t.thread_id;
              const acctHealth = healthMap.get(t.platform_account_id) || 'unknown';

              return (
                <button
                  key={t.id}
                  onClick={() => setActiveThreadId(t.thread_id)}
                  className={`w-full text-right p-4 transition-all border-b border-gray-50/50 hover:bg-white flex items-start gap-3 ${isActive ? 'bg-white shadow-sm ring-1 ring-black/5 z-10' : ''}`}
                >
                  <div className={`relative w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center font-bold text-lg ${p.bg} ${p.text}`}>
                    {(t.guest_name || 'G')[0]}
                    {acctHealth !== 'healthy' && acctHealth !== 'unknown' && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-400 border-2 border-white" />
                    )}
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
            <p className="text-xs text-gray-300">آخر تحديث: {lastFetch.toLocaleTimeString('ar-SA')}</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl ${PLATFORM_COLORS[selectedThread?.platform || 'airbnb'].bg} ${PLATFORM_COLORS[selectedThread?.platform || 'airbnb'].text}`}>
                  {(selectedThread?.guest_name || 'G')[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedThread?.guest_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {healthMap.get(selectedThread?.platform_account_id || '') === 'healthy' ? (
                      <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold bg-green-50 px-1.5 py-0.5 rounded-full">
                        <Wifi className="w-3 h-3" /> متصل
                      </span>
                    ) : healthMap.get(selectedThread?.platform_account_id || '') === 'unknown' ? (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded-full">
                        <Wifi className="w-3 h-3" /> غير محدد
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-full">
                        <WifiOff className="w-3 h-3" /> الجلسة منتهية
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{selectedThread?.account_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchHistory(activeThreadId)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  title="تحديث المحادثة"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setActiveThreadId(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar">
              {isLoadingHistory && history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  جاري تحميل الرسائل...
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  لا توجد رسائل محفوظة لهذه المحادثة بعد
                </div>
              ) : (
                history.map((m, idx) => {
                  const isMe  = m.is_from_me === 1;
                  const showDate = idx === 0 ||
                    new Date(m.sent_at).toDateString() !== new Date(history[idx - 1].sent_at).toDateString();

                  return (
                    <div key={m.id} className="space-y-4">
                      {showDate && (
                        <div className="flex justify-center">
                          <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 shadow-sm">
                            {new Date(m.sent_at).toLocaleDateString('ar-SA', {
                              weekday: 'long', day: 'numeric', month: 'long',
                            })}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                        <div className="max-w-[80%] space-y-1">
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
            <div className="p-5 border-t border-gray-50 bg-white space-y-2">
              {/* Error banner */}
              {sendError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{sendError}</span>
                  <button onClick={() => setSendError(null)} className="shrink-0 hover:text-red-800">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Warn if session not healthy */}
              {healthMap.get(selectedThread?.platform_account_id || '') === 'expired' && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-700">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  الجلسة منتهية — افتح نافذة {selectedThread?.platform === 'airbnb' ? 'Airbnb' : 'جاذر إن'} من صفحة الحسابات ثم حاول مجدداً
                </div>
              )}

              {/* Text input — works for both Airbnb and Gathern */}
              <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  placeholder={`اكتب ردك على ${selectedThread?.platform === 'airbnb' ? 'Airbnb' : 'جاذر إن'}...`}
                  rows={1}
                  className="flex-1 max-h-32 min-h-[44px] px-4 py-3 bg-transparent border-none outline-none text-sm resize-none"
                />
                <button
                  onClick={handleReply}
                  disabled={isSending || !replyText.trim()}
                  className="w-11 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:grayscale shadow-lg shadow-blue-200"
                >
                  {isSending
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar        { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track  { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb  { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
