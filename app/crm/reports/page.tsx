"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
    TrendingUp, Users, Activity, BarChart3, DollarSign,
    Target, Handshake, XCircle, Archive, Clock, Zap,
    AlertTriangle, Crown, User, Calendar, ArrowUpRight,
    Flame, ShieldAlert, Award, Loader2, RefreshCw,
    ChevronDown, ChevronUp, Trophy, Percent, ChevronLeft
} from "lucide-react";

/* ────── Stage Config ────── */
const STAGE_MAP: Record<string, { label: string; color: string }> = {
    new: { label: 'جديد', color: '#64748b' },
    contacting: { label: 'تواصل', color: '#3b82f6' },
    qualified: { label: 'مؤهل', color: '#06b6d4' },
    proposal: { label: 'عرض سعر', color: '#8b5cf6' },
    negotiation: { label: 'تفاوض', color: '#f59e0b' },
    won: { label: 'تم الاتفاق', color: '#10b981' },
    paid: { label: 'تم الدفع', color: '#14b8a6' },
    completed: { label: 'مكتمل', color: '#22c55e' },
    lost: { label: 'خسارة', color: '#ef4444' },
};

const AR_STAGE_TO_ID: Record<string, string> = {};
Object.entries(STAGE_MAP).forEach(([id, cfg]) => { AR_STAGE_TO_ID[cfg.label] = id; });
Object.keys(STAGE_MAP).forEach(id => { AR_STAGE_TO_ID[id] = id; });

const PERIOD_OPTIONS = [
    { value: 'all', label: 'كل الفترات' },
    { value: 'week', label: 'آخر أسبوع' },
    { value: 'month', label: 'آخر شهر' },
    { value: 'quarter', label: 'آخر 3 أشهر' },
];

function fmt(v: number): string { return v ? v.toLocaleString("ar-SA") : "0"; }
function fmtDate(d: string): string {
    try { return new Date(d).toLocaleDateString("ar-SA", { month: "short", day: "numeric" }); }
    catch { return d; }
}
function fmtMonth(m: string): string {
    const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    try { return months[parseInt(m.split('-')[1]) - 1] || m; } catch { return m; }
}

export default function CRMReportsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [expandedSection, setExpandedSection] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/crm/reports?period=${period}`);
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);



    // Build Funnel Data from actual database aggregations
    const funnelSteps = Object.keys(STAGE_MAP).filter(s => s !== 'lost').map((sId, index, array) => {
        // active deals currently sitting here
        const activeDeals = data?.stagePerformance?.find((st: any) => st.current_stage === sId)?.active_deals || 0;
        // deals that were lost WHILE in this stage
        const lostDeals = data?.stagePerformance?.find((st: any) => st.current_stage === sId)?.lost_deals || 0;
        // deals that historically reached this stage at any point
        const historicalReaches = data?.historicalStages?.find((st: any) => st.to_stage === STAGE_MAP[sId].label)?.deals_reached || 0;

        return {
            id: sId,
            label: STAGE_MAP[sId].label,
            color: STAGE_MAP[sId].color,
            activeDeals,
            lostDeals,
            historicalReaches,
            riskLevel: lostDeals > 2 ? 'high' : lostDeals > 0 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
        };
    }); 


    // Calculations
    const wonCount = data?.wonDeals?.count || 0;
    const lostCount = data?.lostDeals?.count || 0;
    const totalCompleted = wonCount + lostCount;
    const winRate = totalCompleted > 0 ? Math.round((wonCount / totalCompleted) * 100) : 0;
    const wonPct = (data?.totalDeals?.count || 0) > 0 ? Math.round((wonCount / (data?.totalDeals?.count || 1)) * 100) : 0;
    const lostPct = (data?.totalDeals?.count || 0) > 0 ? Math.round((lostCount / (data?.totalDeals?.count || 1)) * 100) : 0;
    const openPct = Math.max(0, 100 - wonPct - lostPct);
    const maxPipeline = data?.dealsByStage?.length ? Math.max(...data.dealsByStage.map((s: any) => s.count)) : 1;
    const maxMonthlyAct = data?.monthlyActivity?.length ? Math.max(...data.monthlyActivity.map((m: any) => m.count)) : 1;

    const toggle = (s: string) => setExpandedSection(prev => prev === s ? null : s);

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#3b82f6', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '14px' }}>جاري تحميل التقارير...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>

            {/* ═══ Header + Period Filter ═══ */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>تقارير وتحليلات CRM</h1>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0' }}>تحليلات شاملة محدثة في الوقت الحقيقي</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Period Filter */}
                    <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
                        {PERIOD_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{
                                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                                background: period === opt.value ? '#fff' : 'transparent',
                                color: period === opt.value ? '#3b82f6' : '#94a3b8',
                                boxShadow: period === opt.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchData} disabled={loading} style={{
                        width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#64748b', transition: 'all 0.15s',
                    }} title="تحديث">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {/* Live indicator */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#15803d' }}>حية</span>
                    </div>
                </div>
            </div>

            {/* Loading overlay */}
            {loading && data && (
                <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '30%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '2px', animation: 'loading 1.2s infinite ease-in-out' }} />
                </div>
            )}

            {/* ═══ KPI Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {[
                    { icon: Users, label: 'إجمالي العملاء', value: data.totalCustomers?.count || 0, sub: `${data.totalCustomers?.active || 0} نشط`, accent: '#3b82f6', bg: '#eff6ff' },
                    { icon: Target, label: 'صفقات مفتوحة', value: data.openDeals?.count || 0, sub: `+${data.weeklyActivity?.count || 0} نشاط أسبوعي`, accent: '#8b5cf6', bg: '#f5f3ff' },
                    { icon: DollarSign, label: 'قيمة Pipeline', value: fmt(Number(data.openDeals?.total_value) || 0), unit: 'ر.س', sub: `${fmt(Number(data.wonDeals?.total_value) || 0)} ر.س محصّلة`, accent: '#10b981', bg: '#ecfdf5' },
                    { icon: TrendingUp, label: 'معدل التحويل', value: `${winRate}%`, sub: `${wonCount} ناجحة من ${totalCompleted}`, accent: '#f59e0b', bg: '#fffbeb' },
                    { icon: Zap, label: 'متوسط الصفقة', value: fmt(Math.round(Number(data.avgDealValue?.avg_val) || 0)), unit: 'ر.س', sub: `${data.totalDeals?.count || 0} صفقة`, accent: '#06b6d4', bg: '#ecfeff' },
                ].map((kpi, i) => (
                    <div key={i} style={{
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px',
                        padding: '18px', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: 0, right: 0, left: 0, height: '3px', background: `linear-gradient(90deg, ${kpi.accent}, ${kpi.accent}88)` }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <kpi.icon size={18} color={kpi.accent} />
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{kpi.label}</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                            {kpi.value}
                            {kpi.unit && <span style={{ fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginRight: '3px' }}>{kpi.unit}</span>}
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* ═══ Pipeline + Donut ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                {/* Pipeline */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={16} color="#475569" />
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>مراحل Pipeline</h3>
                        </div>
                        <span style={{ fontSize: '10px', color: '#94a3b8', background: '#f8fafc', padding: '3px 8px', borderRadius: '5px' }}>{data.openDeals?.count || 0} صفقة</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {data.dealsByStage?.length > 0 ? data.dealsByStage.map((item: any) => {
                            const cfg = STAGE_MAP[item.stage] || { label: item.stage, color: '#94a3b8' };
                            const pct = Math.max(Math.round((item.count / maxPipeline) * 100), 6);
                            return (
                                <div key={item.stage} style={{ cursor: 'pointer' }} onClick={() => toggle(`stage-${item.stage}`)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cfg.color }} />
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{cfg.label}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {Number(item.total_value) > 0 && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{fmt(Number(item.total_value))} ر.س</span>}
                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{item.count}</span>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '5px', height: '8px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '5px', background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}cc)`, transition: 'width 0.8s ease-out' }} />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#cbd5e1' }}>
                                <BarChart3 size={32} style={{ margin: '0 auto 6px', opacity: 0.3 }} />
                                <p style={{ fontSize: '12px' }}>لا توجد صفقات</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Donut */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: '#0f172a', alignSelf: 'stretch' }}>نسبة الصفقات</h3>
                    <div style={{
                        width: '160px', height: '160px', borderRadius: '50%',
                        background: `conic-gradient(#10b981 0deg ${wonPct * 3.6}deg, #ef4444 ${wonPct * 3.6}deg ${(wonPct + lostPct) * 3.6}deg, #3b82f6 ${(wonPct + lostPct) * 3.6}deg 360deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ width: '108px', height: '108px', borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a' }}>{data.totalDeals?.count || 0}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>صفقة</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', width: '100%' }}>
                        {[
                            { label: 'ناجحة', count: wonCount, pct: wonPct, color: '#10b981' },
                            { label: 'خاسرة', count: lostCount, pct: lostPct, color: '#ef4444' },
                            { label: 'مفتوحة', count: data.openDeals?.count || 0, pct: openPct, color: '#3b82f6' },
                        ].map(item => (
                            <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: item.color }} />
                                    <span style={{ fontSize: '11px', color: '#475569' }}>{item.label}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{item.count}</span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{item.pct}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══ Pipeline Funnel Analysis (New Bottleneck) ═══ */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                            <Flame size={20} color="#fff" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>مسار التحويل والاختناقات (Funnel)</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>أين تتوقف الصفقات؟ وكم عدد الصفقات المفقودة في كل مرحلة؟</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }}>
                    {funnelSteps.map((step, idx) => {
                        return (
                            <div key={step.id} style={{
                                flex: '1', minWidth: '130px', background: '#f8fafc',
                                borderRadius: '10px', padding: '16px 12px',
                                border: `1px solid ${step.riskLevel === 'high' ? '#fecaca' : '#e2e8f0'}`,
                                position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px',
                            }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: step.color }} />
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{step.label}</span>
                                </div>
                                
                                {/* Core Metrics */}
                                <div style={{ background: '#fff', borderRadius: '8px', padding: '10px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>إجمالي الوصول</span>
                                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{step.historicalReaches}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', color: '#64748b' }}>نشطة حالياً</span>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: step.color }}>{step.activeDeals}</span>
                                    </div>
                                </div>

                                {/* Loss metric */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: step.lostDeals > 0 ? '#fef2f2' : 'transparent', padding: '6px', borderRadius: '6px' }}>
                                    <span style={{ fontSize: '11px', color: step.lostDeals > 0 ? '#ef4444' : '#cbd5e1', fontWeight: 600 }}>
                                        {step.lostDeals > 0 ? `خسرنا ${step.lostDeals} هنا` : 'بدون خسائر'}
                                    </span>
                                </div>

                                {/* Arrow connecting to next */}
                                {idx < funnelSteps.length - 1 && (
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '-10px', transform: 'translateY(-50%)',
                                        width: '20px', height: '20px', background: '#e2e8f0', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                                    }}>
                                        <ChevronLeft size={12} color="#64748b" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ Employee Performance (IMPROVED) ═══ */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Award size={16} color="#8b5cf6" />
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>أداء الموظفين</h3>
                </div>
                {data.employeePerf?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Header Row */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '40px 1fr 90px 90px 90px 100px 80px',
                            padding: '8px 14px', background: '#f8fafc', borderRadius: '8px',
                            fontSize: '10px', fontWeight: 600, color: '#64748b',
                        }}>
                            <span>#</span>
                            <span>الموظف</span>
                            <span style={{ textAlign: 'center' }}>الأنشطة</span>
                            <span style={{ textAlign: 'center' }}>الصفقات</span>
                            <span style={{ textAlign: 'center' }}>ناجحة ✅</span>
                            <span style={{ textAlign: 'center' }}>قيمة الناجحة</span>
                            <span style={{ textAlign: 'center' }}>معدل النجاح</span>
                        </div>

                        {data.employeePerf.map((emp: any, idx: number) => {
                            const empWinRate = (Number(emp.won_count) + Number(emp.lost_count)) > 0
                                ? Math.round((Number(emp.won_count) / (Number(emp.won_count) + Number(emp.lost_count))) * 100)
                                : 0;
                            const isTop = idx === 0 && Number(emp.won_count) > 0;
                            const maxAct = data.employeePerf[0].activity_count || 1;
                            const barPct = Math.round((emp.activity_count / maxAct) * 100);

                            return (
                                <div key={idx} style={{
                                    display: 'grid', gridTemplateColumns: '40px 1fr 90px 90px 90px 100px 80px',
                                    padding: '12px 14px', alignItems: 'center',
                                    background: isTop ? '#faf5ff' : idx % 2 === 0 ? '#fafbfc' : '#fff',
                                    borderRadius: '10px', border: isTop ? '1px solid #e9d5ff' : '1px solid transparent',
                                    transition: 'background 0.15s',
                                }}>
                                    {/* Rank */}
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                        background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #eab308)' :
                                                   idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                                                   idx === 2 ? 'linear-gradient(135deg, #f97316, #ea580c)' : '#e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: idx < 3 ? '#fff' : '#64748b', fontSize: '12px', fontWeight: 800,
                                    }}>
                                        {idx + 1}
                                    </div>

                                    {/* Name + Activity Bar */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingInline: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{emp.name}</span>
                                            {isTop && <span style={{ fontSize: '11px' }}>⭐</span>}
                                        </div>
                                        <div style={{ width: '100%', background: '#e2e8f0', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${barPct}%`, height: '100%', borderRadius: '3px', background: isTop ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : '#94a3b8' }} />
                                        </div>
                                    </div>

                                    {/* Activities */}
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{emp.activity_count}</span>
                                    </div>

                                    {/* Deals */}
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{emp.deals_worked_on}</span>
                                    </div>

                                    {/* Won */}
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: Number(emp.won_count) > 0 ? '#10b981' : '#cbd5e1' }}>
                                            {emp.won_count}
                                        </span>
                                        {Number(emp.lost_count) > 0 && (
                                            <span style={{ fontSize: '10px', color: '#ef4444', marginRight: '3px' }}>({emp.lost_count} خسارة)</span>
                                        )}
                                    </div>

                                    {/* Won Value */}
                                    <div style={{ textAlign: 'center' }}>
                                        {Number(emp.won_value) > 0 ? (
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                                                {fmt(Number(emp.won_value))} <span style={{ fontSize: '9px', color: '#94a3b8' }}>ر.س</span>
                                            </span>
                                        ) : <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>}
                                    </div>

                                    {/* Win Rate */}
                                    <div style={{ textAlign: 'center' }}>
                                        {(Number(emp.won_count) + Number(emp.lost_count)) > 0 ? (
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '2px',
                                                fontSize: '12px', fontWeight: 700,
                                                color: empWinRate >= 60 ? '#10b981' : empWinRate >= 30 ? '#f59e0b' : '#ef4444',
                                                background: empWinRate >= 60 ? '#ecfdf5' : empWinRate >= 30 ? '#fffbeb' : '#fef2f2',
                                                padding: '3px 8px', borderRadius: '6px',
                                            }}>
                                                {empWinRate}%
                                            </div>
                                        ) : <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#cbd5e1', fontSize: '12px' }}>لا توجد بيانات</div>
                )}
            </div>

            {/* ═══ Top Customers + Recent Deals ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Top Customers */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <Crown size={16} color="#f59e0b" />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>أفضل العملاء</h3>
                    </div>
                    {data.topCustomers?.length > 0 ? data.topCustomers.map((c: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    background: idx === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : idx === 1 ? '#9ca3af' : idx === 2 ? '#fb923c' : '#e2e8f0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: idx < 3 ? '#fff' : '#64748b', fontSize: '11px', fontWeight: 800,
                                }}>{idx + 1}</div>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{c.customer_name}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>{c.deal_count} صفقة</div>
                                </div>
                            </div>
                            {Number(c.total_value) > 0 && <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{fmt(Number(c.total_value))} ر.س</span>}
                        </div>
                    )) : <div style={{ textAlign: 'center', padding: '32px', color: '#cbd5e1', fontSize: '12px' }}>لا بيانات</div>}
                </div>

                {/* Recent Deals */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        <Clock size={16} color="#64748b" />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>آخر الصفقات</h3>
                    </div>
                    {data.recentDeals?.length > 0 ? data.recentDeals.map((deal: any, idx: number) => {
                        const cfg = STAGE_MAP[deal.stage] || { label: deal.stage, color: '#94a3b8' };
                        return (
                            <Link key={idx} href={`/crm/deals/${deal.id}`} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 20px', borderBottom: '1px solid #f8fafc', textDecoration: 'none',
                            }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.title}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{deal.customer_name} • {fmtDate(deal.created_at)}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    {Number(deal.value) > 0 && <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b' }}>{fmt(Number(deal.value))} ر.س</span>}
                                    <span style={{ fontSize: '9px', fontWeight: 600, color: cfg.color, background: cfg.color + '12', padding: '2px 6px', borderRadius: '4px' }}>{cfg.label}</span>
                                </div>
                            </Link>
                        );
                    }) : <div style={{ textAlign: 'center', padding: '32px', color: '#cbd5e1', fontSize: '12px' }}>لا صفقات</div>}
                </div>
            </div>

            {/* ═══ Activity Timeline ═══ */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={16} color="#475569" />
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>النشاط عبر الزمن</h3>
                    </div>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>آخر 6 أشهر</span>
                </div>
                {data.monthlyActivity?.length > 0 ? (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px', padding: '0 6px', borderBottom: '2px solid #f1f5f9' }}>
                            {data.monthlyActivity.map((m: any, idx: number) => {
                                const h = Math.max(Math.round((m.count / maxMonthlyAct) * 120), 8);
                                const dealMonth = data.monthlyDeals?.find((d: any) => d.month === m.month);
                                return (
                                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', height: '100%' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#475569' }}>{m.count}</span>
                                        <div style={{ width: '100%', maxWidth: '42px', borderRadius: '5px 5px 0 0', height: `${h}px`, background: 'linear-gradient(180deg, #3b82f6, #60a5fa)', position: 'relative', transition: 'height 0.5s ease-out' }}>
                                            {dealMonth && dealMonth.count > 0 && (
                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${Math.max(Math.round((dealMonth.count / m.count) * 100), 8)}%`, background: 'rgba(16,185,129,0.5)' }} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', padding: '6px 6px 0' }}>
                            {data.monthlyActivity.map((m: any, idx: number) => (
                                <div key={idx} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#94a3b8' }}>{fmtMonth(m.month)}</div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#3b82f6' }} />
                                <span style={{ fontSize: '10px', color: '#64748b' }}>الأنشطة</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
                                <span style={{ fontSize: '10px', color: '#64748b' }}>صفقات جديدة</span>
                            </div>
                        </div>
                    </div>
                ) : <div style={{ textAlign: 'center', padding: '32px', color: '#cbd5e1', fontSize: '12px' }}>لا بيانات</div>}
            </div>

            {/* ═══ Summary Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '14px', padding: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>صفقات ناجحة</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800 }}>{wonCount}</p>
                            {Number(data.wonDeals?.total_value) > 0 && <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>{fmt(Number(data.wonDeals.total_value))} ر.س</p>}
                        </div>
                        <Handshake size={30} style={{ opacity: 0.2 }} />
                    </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '14px', padding: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>صفقات خاسرة</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800 }}>{lostCount}</p>
                        </div>
                        <XCircle size={30} style={{ opacity: 0.2 }} />
                    </div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #475569, #334155)', borderRadius: '14px', padding: '20px', color: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>إجمالي الصفقات</p>
                            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800 }}>{data.totalDeals?.count || 0}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.7 }}>{data.closedDeals?.count || 0} مغلقة • {data.openDeals?.count || 0} مفتوحة</p>
                        </div>
                        <Archive size={30} style={{ opacity: 0.2 }} />
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
                @keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
            `}</style>
        </div>
    );
}
