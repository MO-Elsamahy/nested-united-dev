"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    Plus, Archive, RotateCcw, TrendingUp, DollarSign,
    Target, User,
    Clock, Handshake,
    Phone, BadgeCheck, FileText, MessagesSquare, CreditCard,
    PackageCheck, Loader2, XCircle, Eye
} from "lucide-react";
import type { CrmDeal } from "@/lib/types/crm";

const STAGES = [
    { id: 'new', label: 'جديد', icon: Clock, color: '#64748b', light: '#f1f5f9', text: '#334155' },
    { id: 'contacting', label: 'تواصل', icon: Phone, color: '#3b82f6', light: '#eff6ff', text: '#1d4ed8' },
    { id: 'qualified', label: 'مؤهل', icon: BadgeCheck, color: '#06b6d4', light: '#ecfeff', text: '#0e7490' },
    { id: 'proposal', label: 'عرض سعر', icon: FileText, color: '#8b5cf6', light: '#f5f3ff', text: '#6d28d9' },
    { id: 'negotiation', label: 'تفاوض', icon: MessagesSquare, color: '#f59e0b', light: '#fffbeb', text: '#b45309' },
    { id: 'won', label: 'تم الاتفاق', icon: Handshake, color: '#10b981', light: '#ecfdf5', text: '#047857' },
    { id: 'paid', label: 'تم الدفع', icon: CreditCard, color: '#14b8a6', light: '#f0fdfa', text: '#0f766e' },
    { id: 'completed', label: 'مكتمل', icon: PackageCheck, color: '#22c55e', light: '#f0fdf4', text: '#15803d' },
    { id: 'lost', label: 'خسارة', icon: XCircle, color: '#ef4444', light: '#fef2f2', text: '#b91c1c' },
];



function formatCurrency(v: number | string | null | undefined): string {
    const n = Number(v);
    if (!n || !Number.isFinite(n)) return "";
    return n.toLocaleString("ar-SA");
}

export default function DealsPage() {
    const [deals, setDeals] = useState<CrmDeal[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [dragOverStage, setDragOverStage] = useState<string | null>(null);

    const fetchDeals = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/deals?status=${statusFilter}`);
            const data = await res.json() as CrmDeal[] | { error: string };
            setDeals(res.ok && Array.isArray(data) ? data : []);
        } catch (e: unknown) {
            console.error(e instanceof Error ? e.message : String(e));
        }
        finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchDeals(); }, [fetchDeals]);

    const openCount = deals.length;
    const totalVal = deals.reduce((s, d) => s + (Number(d.value) || 0), 0);
    const wonCount = deals.filter(d => ['won', 'paid', 'completed'].includes(d.stage)).length;
    const winRate = openCount > 0 ? Math.round((wonCount / openCount) * 100) : 0;

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggingId(id);
        e.dataTransfer.setData("dealId", id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDrop = async (e: React.DragEvent, newStage: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("dealId");
        setDragOverStage(null);
        setDraggingId(null);
        if (!id) return;

        setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: newStage } : d));

        try {
            const res = await fetch("/api/crm/deals", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, stage: newStage }),
            });
            if (!res.ok) { alert("فشل تحديث المرحلة"); await fetchDeals(); }
        } catch { alert("فشل تحديث المرحلة"); await fetchDeals(); }
    };

    const handleArchive = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'open' ? 'closed' : 'open';
        if (!confirm(newStatus === 'closed' ? "أرشفة هذه الصفقة؟" : "إعادة فتح الصفقة؟")) return;
        setDeals(prev => prev.filter(d => d.id !== id));
        try {
            await fetch("/api/crm/deals", {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });
            await fetchDeals();
        } catch { await fetchDeals(); }
    };

    return (
        <div style={{ height: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* ═══════════ Top Bar ═══════════ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.3 }}>
                        مسار الصفقات
                    </h1>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>إدارة ومتابعة الصفقات بسهولة</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Filter Toggle */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
                        {(['open', 'closed'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                style={{
                                    padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                                    background: statusFilter === f ? '#fff' : 'transparent',
                                    color: statusFilter === f ? (f === 'open' ? '#3b82f6' : '#64748b') : '#94a3b8',
                                    boxShadow: statusFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                }}
                            >
                                {f === 'open' ? 'المفتوحة' : 'المؤرشفة'}
                            </button>
                        ))}
                    </div>

                    <Link
                        href="/crm/deals/new"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                            padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            textDecoration: 'none', boxShadow: '0 2px 8px rgba(59,130,246,0.3)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Plus size={16} />
                        صفقة جديدة
                    </Link>
                </div>
            </div>

            {/* ═══════════ KPI Strip ═══════════ */}
            {statusFilter === 'open' && !loading && (
                <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                        { icon: Target, label: 'صفقات مفتوحة', value: openCount, accent: '#3b82f6', bg: '#eff6ff' },
                        { icon: DollarSign, label: 'إجمالي القيم', value: `${totalVal.toLocaleString("ar-SA")} ر.س`, accent: '#10b981', bg: '#ecfdf5' },
                        { icon: TrendingUp, label: 'معدل النجاح', value: `${winRate}%`, accent: '#8b5cf6', bg: '#f5f3ff' },
                    ].map((kpi, i) => (
                        <div key={i} style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: '12px',
                            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                            padding: '14px 16px',
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <kpi.icon size={18} color={kpi.accent} />
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{kpi.label}</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>{kpi.value}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════════ Kanban Board ═══════════ */}
            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Loader2 size={28} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 8px' }} />
                        <span style={{ fontSize: '13px' }}>جاري التحميل...</span>
                    </div>
                </div>
            ) : (
                <div style={{
                    flex: 1, overflowX: 'auto', overflowY: 'hidden',
                    paddingBottom: '8px', margin: '0 -4px',
                }}>
                    <div style={{
                        display: 'flex', gap: '10px', height: '100%',
                        minWidth: `${STAGES.length * 200}px`, padding: '0 4px',
                    }}>
                        {STAGES.map(stage => {
                            const stageDeals = deals.filter(d => d.stage === stage.id);
                            const stageVal = stageDeals.reduce((s, d) => s + (Number(d.value) || 0), 0);
                            const StageIcon = stage.icon;
                            const isOver = dragOverStage === stage.id;

                            return (
                                <div
                                    key={stage.id}
                                    style={{
                                        flex: 1, minWidth: '190px', display: 'flex', flexDirection: 'column',
                                        borderRadius: '14px', overflow: 'hidden',
                                        background: isOver ? stage.light : '#f8fafc',
                                        border: `1.5px ${isOver ? 'solid' : 'dashed'} ${isOver ? stage.color : '#e2e8f0'}`,
                                        transition: 'all 0.25s ease',
                                        transform: isOver ? 'scale(1.01)' : 'none',
                                    }}
                                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverStage(stage.id); }}
                                    onDragLeave={() => setDragOverStage(null)}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                >
                                    {/* Column Header */}
                                    <div style={{
                                        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px',
                                        borderBottom: `2px solid ${stage.color}`,
                                        background: '#fff',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <div style={{
                                                    width: '28px', height: '28px', borderRadius: '8px',
                                                    background: stage.light, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <StageIcon size={14} color={stage.color} />
                                                </div>
                                                <span style={{ fontWeight: 700, fontSize: '13px', color: stage.text }}>{stage.label}</span>
                                            </div>
                                            <span style={{
                                                background: stage.light, color: stage.color,
                                                fontSize: '11px', fontWeight: 700,
                                                padding: '2px 8px', borderRadius: '6px',
                                                minWidth: '22px', textAlign: 'center',
                                            }}>
                                                {stageDeals.length}
                                            </span>
                                        </div>
                                        {stageVal > 0 && (
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, paddingRight: '35px' }}>
                                                {stageVal.toLocaleString("ar-SA")} ر.س
                                            </span>
                                        )}
                                    </div>

                                    {/* Cards */}
                                    <div style={{
                                        flex: 1, padding: '8px', display: 'flex', flexDirection: 'column',
                                        gap: '6px', overflowY: 'auto',
                                    }}>
                                        {stageDeals.map(deal => {
                                            const val = formatCurrency(deal.value);
                                            const isDragging = draggingId === deal.id;

                                            return (
                                                <div
                                                    key={deal.id}
                                                    draggable={statusFilter === 'open'}
                                                    onDragStart={(e) => handleDragStart(e, deal.id)}
                                                    style={{
                                                        background: '#fff', borderRadius: '10px',
                                                        border: '1px solid #e8ecf1',
                                                        padding: '12px', cursor: statusFilter === 'open' ? 'grab' : 'default',
                                                        transition: 'all 0.2s ease',
                                                        opacity: isDragging ? 0.35 : 1,
                                                        transform: isDragging ? 'scale(0.95) rotate(-1deg)' : 'none',
                                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                                        position: 'relative',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (!isDragging) {
                                                            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                                            (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#e8ecf1';
                                                    }}
                                                >
                                                    {/* Priority dot */}
                                                    {deal.priority === 'high' && (
                                                        <div style={{
                                                            position: 'absolute', top: '8px', left: '8px',
                                                            width: '7px', height: '7px', borderRadius: '50%',
                                                            background: '#ef4444',
                                                            boxShadow: '0 0 0 2px rgba(239,68,68,0.15)',
                                                            animation: 'pulse 2s infinite',
                                                        }} title="عاجل" />
                                                    )}

                                                    {/* Title */}
                                                    <Link
                                                        href={`/crm/deals/${deal.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            display: 'block', fontWeight: 600, fontSize: '13px',
                                                            color: '#1e293b', lineHeight: 1.5, textDecoration: 'none',
                                                            marginBottom: '8px',
                                                        }}
                                                        onMouseEnter={e => (e.currentTarget.style.color = '#3b82f6')}
                                                        onMouseLeave={e => (e.currentTarget.style.color = '#1e293b')}
                                                    >
                                                        {deal.title}
                                                    </Link>

                                                    {/* Customer */}
                                                    {deal.customer_name && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                            <div style={{
                                                                width: '20px', height: '20px', borderRadius: '50%',
                                                                background: `linear-gradient(135deg, ${stage.light}, ${stage.color}22)`,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                            }}>
                                                                <User size={10} color={stage.color} />
                                                            </div>
                                                            <span style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {deal.customer_name}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Footer */}
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        paddingTop: '8px', borderTop: '1px solid #f1f5f9',
                                                    }}>
                                                        {val ? (
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                                                                {val} <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '10px' }}>ر.س</span>
                                                            </span>
                                                        ) : (
                                                            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>
                                                        )}

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            {/* Quick Stage Change */}
                                                            {statusFilter === 'open' && (
                                                                <div style={{ position: 'relative' }}>
                                                                    <select
                                                                        value={deal.stage}
                                                                        onChange={async (e) => {
                                                                            e.stopPropagation();
                                                                            const newStage = e.target.value;
                                                                            setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: newStage } : d));
                                                                            try {
                                                                                const res = await fetch("/api/crm/deals", {
                                                                                    method: "PUT",
                                                                                    headers: { "Content-Type": "application/json" },
                                                                                    body: JSON.stringify({ id: deal.id, stage: newStage }),
                                                                                });
                                                                                if (!res.ok) { alert("فشل تحديث المرحلة"); await fetchDeals(); }
                                                                            } catch { alert("فشل تحديث المرحلة"); await fetchDeals(); }
                                                                        }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{
                                                                            appearance: 'none', WebkitAppearance: 'none',
                                                                            background: '#f8fafc', border: '1px solid #e2e8f0',
                                                                            borderRadius: '6px', padding: '3px 20px 3px 6px',
                                                                            fontSize: '10px', fontWeight: 600, color: '#475569',
                                                                            cursor: 'pointer', outline: 'none',
                                                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                                                            backgroundRepeat: 'no-repeat',
                                                                            backgroundPosition: 'left 5px center',
                                                                            maxWidth: '80px',
                                                                        }}
                                                                        title="نقل لمرحلة أخرى"
                                                                    >
                                                                        {STAGES.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.label}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            <Link
                                                                href={`/crm/deals/${deal.id}`}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    width: '24px', height: '24px', borderRadius: '6px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#94a3b8', transition: 'all 0.15s', background: 'transparent',
                                                                    textDecoration: 'none', border: 'none', cursor: 'pointer',
                                                                }}
                                                                title="عرض التفاصيل"
                                                                onMouseEnter={e => { (e.currentTarget).style.background = '#f1f5f9'; (e.currentTarget).style.color = '#3b82f6'; }}
                                                                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#94a3b8'; }}
                                                            >
                                                                <Eye size={13} />
                                                            </Link>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleArchive(deal.id, statusFilter); }}
                                                                style={{
                                                                    width: '24px', height: '24px', borderRadius: '6px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: '#94a3b8', transition: 'all 0.15s', background: 'transparent',
                                                                    border: 'none', cursor: 'pointer', padding: 0,
                                                                }}
                                                                title={statusFilter === 'open' ? "أرشفة" : "إعادة فتح"}
                                                                onMouseEnter={e => { (e.currentTarget).style.background = '#fef2f2'; (e.currentTarget).style.color = '#ef4444'; }}
                                                                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = '#94a3b8'; }}
                                                            >
                                                                {statusFilter === 'open' ? <Archive size={12} /> : <RotateCcw size={12} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Empty state */}
                                        {stageDeals.length === 0 && (
                                            <div style={{
                                                flex: 1, display: 'flex', flexDirection: 'column',
                                                alignItems: 'center', justifyContent: 'center',
                                                padding: '28px 12px', opacity: 0.5,
                                            }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    border: `2px dashed ${stage.color}40`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    marginBottom: '8px',
                                                }}>
                                                    <StageIcon size={16} color={`${stage.color}60`} />
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>لا توجد صفقات</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Pulse animation for priority */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                div::-webkit-scrollbar { height: 6px; }
                div::-webkit-scrollbar-track { background: transparent; }
                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
        </div>
    );
}
