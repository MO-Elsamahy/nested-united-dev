"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  PieChart as LucidePieChart,
  ChevronDown,
  Building2,
  Percent,
  Users,
  Briefcase,
  ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Account {
  id: string;
  platform: string;
  account_name: string;
  ids?: string;
}

interface AnalyticsDashboardClientProps {
  initialAccounts: Account[];
  lastSyncTime: string | null;
  activeTab: "executive" | "live_ops" | "profitability" | "crm" | "hr";
}

export function AnalyticsDashboardClient({
  initialAccounts,
  lastSyncTime,
  activeTab,
}: AnalyticsDashboardClientProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("month");

  // Date selection states
  const now = new Date();
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getISOWeekString = (date: Date): string => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const getMondayOfISOWeek = (weekStr: string): Date => {
    const parts = weekStr.split("-W");
    if (parts.length !== 2) return new Date();
    const year = parseInt(parts[0], 10);
    const week = parseInt(parts[1], 10);
    const d = new Date(year, 0, 4);
    const day = d.getDay();
    const mondayOfWeek1 = new Date(year, 0, 4 - (day === 0 ? 6 : day - 1));
    mondayOfWeek1.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
    return mondayOfWeek1;
  };

  const getWeekNumberOnly = (weekStr: string): string => {
    const parts = weekStr.split("-W");
    return parts[1] ? String(parseInt(parts[1], 10)) : "";
  };

  const [selectedDay, setSelectedDay] = useState<string>(getLocalDateString(now));
  const [selectedWeek, setSelectedWeek] = useState<string>(getISOWeekString(now));
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()));
  const [customStartDate, setCustomStartDate] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  );
  const [customEndDate, setCustomEndDate] = useState<string>(getLocalDateString(now));

  const getComputedDates = () => {
    const todayStr = getLocalDateString(now);
    if (dateRange === "today") {
      return { startDate: selectedDay, endDate: selectedDay };
    }
    if (dateRange === "week") {
      const monday = getMondayOfISOWeek(selectedWeek);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { startDate: getLocalDateString(monday), endDate: getLocalDateString(sunday) };
    }
    if (dateRange === "month") {
      const [year, month] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      return {
        startDate: `${selectedMonth}-01`,
        endDate: `${selectedMonth}-${String(lastDay).padStart(2, "0")}`
      };
    }
    if (dateRange === "year") {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`
      };
    }
    if (dateRange === "all") {
      return {
        startDate: "2020-01-01",
        endDate: "2030-12-31"
      };
    }
    // custom
    return { startDate: customStartDate, endDate: customEndDate };
  };

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const bypassCacheRef = useRef<boolean>(true); // Start true for fresh first load

  // Live data states
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [localSyncTime, setLocalSyncTime] = useState<Date | null>(
    lastSyncTime ? new Date(lastSyncTime) : new Date()
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleRefresh = (bypass: boolean = true) => {
    bypassCacheRef.current = bypass;
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Auto refresh every 30 seconds & instant refresh when returning to tab
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        handleRefresh(false);
      }
    }, 30000); // 30 seconds

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleRefresh(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const bypass = bypassCacheRef.current;
        bypassCacheRef.current = false; // Reset

        const { startDate, endDate } = getComputedDates();

        const queryParams = new URLSearchParams({
          account: selectedAccount,
          range: dateRange, // Send the selected dateRange for dynamic grouping
          startDate: startDate,
          endDate: endDate,
        });
        if (bypass) {
          queryParams.append("bypass", "true");
        }
        const res = await fetch(`/api/analytics?${queryParams.toString()}`);
        if (!res.ok) {
          throw new Error("فشل تحميل البيانات المالية والتشغيلية");
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setLocalSyncTime(new Date());
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || "حدث خطأ غير متوقع أثناء استرجاع المؤشرات");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [
    selectedAccount,
    dateRange,
    selectedDay,
    selectedWeek,
    selectedMonth,
    selectedYear,
    customStartDate,
    customEndDate,
    isRefreshing
  ]);

  const formattedSyncTime = localSyncTime
    ? localSyncTime.toLocaleString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "لم تتم المزامنة بعد";

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">التحليلات المتقدمة</h1>
          <p className="text-sm text-gray-500 mt-1">
            مؤشرات أداء الأعمال الحية والإحصاءات التشغيلية والمالية الشاملة
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm transition-all text-sm font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing || loading ? "animate-spin" : ""}`} />
            <span>تحديث لوحة التحليلات</span>
          </button>
        </div>
      </div>

      {/* 2. Global Controls Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
          {/* Smart Account Filter */}
          <div className="flex flex-col gap-1.5 min-w-[220px]">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <span>مصدر البيانات والمنصات</span>
            </label>
            <div className="relative">
              <select
                value={selectedAccount}
                onChange={(e) => {
                  bypassCacheRef.current = true;
                  setSelectedAccount(e.target.value);
                }}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none pl-8"
              >
                <option value="all">كل المنصات والحسابات</option>
                {initialAccounts.map((account) => (
                  <option key={account.id} value={account.ids || account.id}>
                    {account.account_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>الفترة الزمنية للتقرير</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200/60 max-w-max">
              {[
                { id: "today", label: "يوم" },
                { id: "week", label: "أسبوع" },
                { id: "month", label: "شهر" },
                { id: "year", label: "سنة" },
                { id: "all", label: "الكل" },
                { id: "custom", label: "مخصص" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    bypassCacheRef.current = true;
                    setDateRange(opt.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    dateRange === opt.id
                      ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                      : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sync Info Badges */}
        <div className="flex items-center gap-3 lg:self-end">
          <div className="flex flex-col text-left lg:text-right gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">مزامنة القنوات المباشرة</span>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>آخر تحديث: {formattedSyncTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Conditional Date picker dependent on selected dateRange */}
      {dateRange === "today" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-4 max-w-max animate-fadeIn">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">اختر اليوم:</label>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setSelectedDay(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}

      {dateRange === "week" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-4 max-w-max animate-fadeIn">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">اختر الأسبوع (أسبوع رقم {getWeekNumberOnly(selectedWeek)}):</label>
            <input
              type="week"
              value={selectedWeek}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setSelectedWeek(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}

      {dateRange === "month" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-4 max-w-max animate-fadeIn">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">اختر الشهر:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setSelectedMonth(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}

      {dateRange === "year" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-4 max-w-max animate-fadeIn">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">اختر السنة:</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setSelectedYear(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3.5 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {dateRange === "all" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex items-center gap-4 max-w-max animate-fadeIn">
          <span className="text-xs font-semibold text-gray-500">تم تحديد كامل الفترة الزمنية للبيانات تلقائياً</span>
        </div>
      )}

      {dateRange === "custom" && (
        <div className="bg-gray-50 rounded-2xl border border-gray-200/70 p-4 flex flex-col sm:flex-row items-center gap-4 max-w-max animate-fadeIn">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">من:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setCustomStartDate(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">إلى:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                bypassCacheRef.current = true;
                setCustomEndDate(e.target.value);
              }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      )}

      {/* Main Contents Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[420px] flex flex-col justify-between relative">
        {loading && !data && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-20 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-gray-500">جاري معالجة وتحليل البيانات الفعلية...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 rounded-xl p-4 my-4 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        {data && (
          <>
            {activeTab === "executive" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Tab Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">ملخص الأداء التنفيذي الموحد</h2>
                  <p className="text-xs text-gray-500 mt-0.5">مؤشرات الأداء الأساسية وإجمالي الإيرادات ومعدلات الإشغال الفعلية</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 1 */}
                  <div className="bg-gradient-to-br from-blue-50/40 to-blue-50/10 border border-blue-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">إجمالي الإيرادات</span>
                      <div className="p-2 bg-blue-500 text-white rounded-xl">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.totalRevenue}</p>
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <span>قراءة حية للتدفقات المالية</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-gradient-to-br from-emerald-50/40 to-emerald-50/10 border border-emerald-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">متوسط نسبة الإشغال</span>
                      <div className="p-2 bg-emerald-500 text-white rounded-xl">
                        <Percent className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.occupancyRate}</p>
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <span>نسبة المساحة المشغولة حالياً</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-gradient-to-br from-amber-50/40 to-amber-50/10 border border-amber-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">متوسط السعر اليومي (ADR)</span>
                      <div className="p-2 bg-amber-500 text-white rounded-xl">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.adr}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-xs font-semibold">
                        <span>متوسط دخل الليلة الواحدة</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4 */}
                  <div className="bg-gradient-to-br from-purple-50/40 to-purple-50/10 border border-purple-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">العائد لكل وحدة متاحة (RevPAR)</span>
                      <div className="p-2 bg-purple-500 text-white rounded-xl">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.revpar}</p>
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <span>توزيع كفاءة استغلال الأصول</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 5 */}
                  <div className="bg-gradient-to-br from-rose-50/40 to-rose-50/10 border border-rose-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">إجمالي الحجوزات</span>
                      <div className="p-2 bg-rose-500 text-white rounded-xl">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.totalBookings} حجز</p>
                      <div className="flex items-center gap-1 text-rose-600 text-xs font-bold">
                        <span>إجمالي الحجوزات المسجلة</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 6 */}
                  <div className="bg-gradient-to-br from-red-50/40 to-red-50/10 border border-red-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">إجمالي المصروفات</span>
                      <div className="p-2 bg-red-500 text-white rounded-xl">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.totalExpenses}</p>
                      <div className="flex items-center gap-1 text-red-600 text-xs font-bold">
                        <span>تكاليف التشغيل والصيانة والرواتب</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 7 */}
                  <div className="bg-gradient-to-br from-teal-50/40 to-teal-50/10 border border-teal-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">صافي الدخل</span>
                      <div className="p-2 bg-teal-500 text-white rounded-xl">
                        <Briefcase className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.netIncome}</p>
                      <div className="flex items-center gap-1 text-teal-600 text-xs font-bold">
                        <span>صافي الأرباح بعد المصروفات</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 8 */}
                  <div className="bg-gradient-to-br from-indigo-50/40 to-indigo-50/10 border border-indigo-100/70 rounded-2xl p-5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500">معدل الضيوف المتكررين</span>
                      <div className="p-2 bg-indigo-500 text-white rounded-xl">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-black text-gray-900">{data.stats.repeatGuestRate}</p>
                      <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold">
                        <span>نسبة ولاء النزلاء وتكرار الحجز</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue Growth Card */}
                  <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">تحليل الإيرادات والنمو الشهري</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">منحنى نمو تدفق المبيعات للأشهر الستة الأخيرة (ر.س)</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">إيرادات نشطة</span>
                    </div>

                    {/* Recharts Area Chart */}
                    <div className="w-full h-[280px] pt-2" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <AreaChart
                            data={data.monthlyData || []}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="rechartsAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                              minTickGap={10}
                              padding={{ left: 25, right: 25 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                              tickFormatter={(v) => (v === 0 ? "" : v.toLocaleString("en-US"))}
                              width={55}
                              orientation="left"
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.month}</p>
                                      <p className="text-white">
                                        الإيرادات: <span className="text-blue-400">{item.amount.toLocaleString()} ر.س</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#3b82f6"
                              strokeWidth={3.5}
                              fillOpacity={1}
                              fill="url(#rechartsAreaGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Platform Share Card */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">توزيع الحصص السوقية للمنصات</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">نسبة المساهمة لقنوات الحجوزات</p>
                    </div>

                    {/* Recharts Pie Chart with Centered Title */}
                    <div className="w-full h-[180px] relative flex items-center justify-center" style={{ direction: "ltr" }}>
                      {isMounted && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10" style={{ direction: "rtl" }}>
                          <span className="text-[10px] font-black text-gray-400">القنوات</span>
                          <span className="text-sm font-black text-slate-800 mt-0.5">حصة السوق</span>
                        </div>
                      )}

                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: "Airbnb Global",
                                  value: data.platformShare.airbnb.percent,
                                  raw: data.platformShare.airbnb.value,
                                  color: "#3b82f6",
                                },
                                {
                                  name: "Gathern Local",
                                  value: data.platformShare.gathern.percent,
                                  raw: data.platformShare.gathern.value,
                                  color: "#14b8a6",
                                },
                                {
                                  name: "حجز خارجي",
                                  value: data.platformShare.external?.percent || 0,
                                  raw: data.platformShare.external?.value || "0 ر.س",
                                  color: "#22c55e",
                                },
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={52}
                              outerRadius={70}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {[
                                {
                                  name: "Airbnb Global",
                                  value: data.platformShare.airbnb.percent,
                                  raw: data.platformShare.airbnb.value,
                                  color: "#3b82f6",
                                },
                                {
                                  name: "Gathern Local",
                                  value: data.platformShare.gathern.percent,
                                  raw: data.platformShare.gathern.value,
                                  color: "#14b8a6",
                                },
                                {
                                  name: "حجز خارجي",
                                  value: data.platformShare.external?.percent || 0,
                                  raw: data.platformShare.external?.value || "0 ر.س",
                                  color: "#22c55e",
                                },
                              ].filter(item => item.value > 0).map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const entry = payload[0];
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold text-right dir-rtl">
                                      <p className="font-bold text-sm" style={{ color: entry.payload.color }}>
                                        {entry.name}
                                      </p>
                                      <p className="mt-1 text-gray-300">
                                        الحصة: {entry.value}% ({entry.payload.raw})
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-28 h-28 rounded-full border-4 border-gray-100 border-t-blue-500 animate-spin" />
                      )}
                    </div>

                    {/* Premium Grid Legend Details */}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-2.5 text-center transition-all hover:bg-blue-50/60">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500 mb-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>Airbnb Global</span>
                        </div>
                        <p className="text-base font-black text-blue-600 leading-none">{data.platformShare.airbnb.percent}%</p>
                        <span className="text-[10px] font-bold text-gray-500 mt-1 block">{data.platformShare.airbnb.value}</span>
                      </div>

                      <div className="bg-teal-50/30 border border-teal-100/50 rounded-xl p-2.5 text-center transition-all hover:bg-teal-50/60">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500 mb-1">
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                          <span>Gathern Local</span>
                        </div>
                        <p className="text-base font-black text-teal-600 leading-none">{data.platformShare.gathern.percent}%</p>
                        <span className="text-[10px] font-bold text-gray-500 mt-1 block">{data.platformShare.gathern.value}</span>
                      </div>

                      <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-2.5 text-center transition-all hover:bg-emerald-50/60">
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-gray-500 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>حجز خارجي</span>
                        </div>
                        <p className="text-base font-black text-emerald-600 leading-none">{data.platformShare.external?.percent || 0}%</p>
                        <span className="text-[10px] font-bold text-gray-500 mt-1 block">{data.platformShare.external?.value || "0 ر.س"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row of Charts/Summaries */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Top Performing Units Card */}
                  <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">أعلى الوحدات أداءً (حسب الإيراد المحقق)</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">أفضل 5 وحدات عقارية تحقيقاً للتدفقات المالية للفترة المحددة</p>
                    </div>

                    <div className="w-full h-[220px]" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart
                            data={(data.profitability || []).slice(0, 5).map((u: any) => ({
                              name: u.name,
                              revenue: parseFloat(u.revenue.replace(/,/g, "")),
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                          >
                            <XAxis type="number" tickFormatter={(v) => `${v.toLocaleString()} ر.س`} />
                            <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#475569", fontSize: 10, fontWeight: "bold" }}
                              width={110}
                              orientation="right"
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const entry = payload[0];
                                  return (
                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md border border-slate-800 text-[11px] font-bold text-right dir-rtl">
                                      <p className="font-bold text-gray-400">{entry.payload.name}</p>
                                      <p className="mt-0.5 text-white">
                                        الإيرادات: <span className="text-teal-400">{entry.value.toLocaleString()} ر.س</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="revenue" fill="#14b8a6" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Operational Summary Quick Card */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col justify-between bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">نظرة عامة على العمليات الحية</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">ملخص الحالة التشغيلية الفورية وأعمال الصيانة</p>
                    </div>

                    <div className="space-y-3.5 my-auto">
                      <div className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span className="text-xs font-bold text-gray-600">شقق جاهزة وشاغرة</span>
                        </div>
                        <span className="text-sm font-black text-blue-700">
                          {(data.liveUnits || []).filter((u: any) => u.status === "شاغر وجاهز").length} شقة
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-xs font-bold text-gray-600">شقق مأهولة بالنزلاء</span>
                        </div>
                        <span className="text-sm font-black text-emerald-700">
                          {(data.liveUnits || []).filter((u: any) => u.status === "مأهول").length} شقة
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-amber-50/40 rounded-xl border border-amber-100/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <span className="text-xs font-bold text-gray-600">شقق قيد التنظيف والتحضير</span>
                        </div>
                        <span className="text-sm font-black text-amber-700">
                          {(data.liveUnits || []).filter((u: any) => u.status === "تنظيف").length} شقة
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-rose-50/40 rounded-xl border border-rose-100/50">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                          <span className="text-xs font-bold text-gray-600">أعمال صيانة نشطة</span>
                        </div>
                        <span className="text-sm font-black text-rose-700">
                          {(data.liveUnits || []).filter((u: any) => u.status === "تحت الصيانة").length} شقة
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                  {/* Chart 1: Cashflow (Income vs Expenses) */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">تدفق السيولة والمصروفات شهرياً</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">مقارنة الإيرادات الحقيقية المحققة مع المصروفات الشاملة (ر.س)</p>
                    </div>
                    <div className="w-full h-[280px]" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.monthlyData || []}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                              tickFormatter={(v) => v.toLocaleString("en-US")}
                              width={55}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.month}</p>
                                      <p className="text-emerald-400">
                                        الإيرادات: {Number(item.amount || 0).toLocaleString()} ر.س
                                      </p>
                                      <p className="text-rose-400">
                                        المصروفات: {Number(item.expenses || 0).toLocaleString()} ر.س
                                      </p>
                                      <p className="text-blue-400 border-t border-slate-700/50 pt-1 mt-1">
                                        صافي الربح: {Math.max(0, Number(item.amount || 0) - Number(item.expenses || 0)).toLocaleString()} ر.س
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar name="الإيرادات" dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar name="المصروفات" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Chart 2: Occupancy Rate Seasonality */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">منحنى مواسم نسب الإشغال الشهري</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">تتبع ذروة مواسم الإشغال على مدار السنة (%)</p>
                    </div>
                    <div className="w-full h-[280px]" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={data.monthlyData || []}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="occupancyGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                              tickFormatter={(v) => `${v}%`}
                              width={40}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.month}</p>
                                      <p className="text-purple-400">
                                        نسبة الإشغال: {item.occupancy || 0}%
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="occupancy"
                              stroke="#8b5cf6"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#occupancyGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Chart 3: Maintenance Status & Tickets Distribution */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">تحليل الصيانة والأعطال</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">توزيع التذاكر النشطة وأكثر الوحدات طلباً للصيانة</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[280px]">
                      {/* Left: Donut for states */}
                      <div className="h-full relative flex items-center justify-center" style={{ direction: "ltr" }}>
                        {isMounted && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10" style={{ direction: "rtl" }}>
                            <span className="text-[9px] font-bold text-gray-400">تذاكر الصيانة</span>
                            <span className="text-xs font-black text-slate-800 mt-0.5">الحالة</span>
                          </div>
                        )}
                        {isMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.maintenanceAnalytics?.statusDist || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="count"
                              >
                                {(data.maintenanceAnalytics?.statusDist || []).map((entry: any, index: number) => {
                                  const colors = ["#ef4444", "#eab308", "#10b981"]; // Open, In Progress, Resolved
                                  const color = colors[index % colors.length];
                                  return <Cell key={`cell-${index}`} fill={color} />;
                                })}
                              </Pie>
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const entry = payload[0];
                                    return (
                                      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-md border border-slate-800 text-xs font-bold text-right dir-rtl">
                                        <p className="font-bold text-gray-300">{entry.payload.status}</p>
                                        <p className="mt-0.5 text-white">العدد: {entry.value}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                        )}
                      </div>

                      {/* Right: Bar for top units */}
                      <div className="h-full flex items-center justify-center" style={{ direction: "ltr" }}>
                        {isMounted ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={data.maintenanceAnalytics?.topUnits || []}
                              layout="vertical"
                              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                            >
                              <XAxis type="number" hide />
                              <YAxis
                                dataKey="name"
                                type="category"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#475569", fontSize: 9, fontWeight: "bold" }}
                                width={65}
                                orientation="right"
                              />
                              <RechartsTooltip
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const entry = payload[0];
                                    return (
                                      <div className="bg-slate-900 text-white p-2 rounded-xl shadow-md border border-slate-800 text-[10px] font-bold text-right dir-rtl">
                                        <p className="text-gray-400">{entry.payload.name}</p>
                                        <p className="text-white">التذاكر: {entry.value}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="count" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={10} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chart 4: Invoice Status & Collection Rates */}
                  <div className="border border-gray-100 rounded-2xl p-5 flex flex-col bg-white shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">تحليل الفواتير ومعدلات التحصيل</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">مقارنة إجمالي قيم الفواتير المصدرة حسب حالتها الحالية</p>
                    </div>
                    <div className="w-full h-[280px]" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={data.invoiceAnalytics || []}
                            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="state"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#64748b", fontSize: 10, fontWeight: "bold" }}
                              tickFormatter={(v) => v.toLocaleString("en-US")}
                              width={55}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.state}</p>
                                      <p className="text-emerald-400">
                                        إجمالي القيمة: {Number(item.total || 0).toLocaleString()} ر.س
                                      </p>
                                      <p className="text-blue-400">
                                        عدد الفواتير: {item.count}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar name="إجمالي الفواتير" dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "live_ops" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Tab Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">الحالة التشغيلية المباشرة للوحدات</h2>
                  <p className="text-xs text-gray-500 mt-0.5">مراقبة لحظية لحجوزات اليوم والوحدات الجاهزة وعمليات الصيانة القائمة</p>
                </div>

                {/* Active Operational Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(data.liveUnits || []).map((unit: any, idx: number) => (
                    <div key={idx} className={`border border-gray-150 border-r-4 rounded-xl p-4 flex flex-col justify-between min-h-[120px] transition-all hover:shadow-md ${unit.color}`}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-900">{unit.title}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 rounded-md text-gray-500">
                          {unit.platform}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-[11px] space-y-0.5">
                          <p className="text-gray-500">العميل: <span className="font-bold text-gray-700">{unit.guest}</span></p>
                          <p className="text-gray-400">{unit.time}</p>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                          unit.status === "مأهول" ? "bg-emerald-100 text-emerald-800" :
                          unit.status === "شاغر وجاهز" ? "bg-blue-100 text-blue-800" :
                          unit.status === "تنظيف" ? "bg-amber-100 text-amber-800" :
                          "bg-rose-100 text-rose-800"
                        }`}>
                          {unit.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "profitability" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Tab Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">تحليل ربحية الوحدات العقارية</h2>
                  <p className="text-xs text-gray-500 mt-0.5">بيان تفصيلي بصافي الربح والهامش المئوي لكل وحدة بعد خصم تكاليف التشغيل والصيانة</p>
                </div>

                {/* Profitability Table */}
                <div className="border border-gray-150 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-600">
                        <tr>
                          <th className="px-5 py-4">اسم الوحدة العقارية</th>
                          <th className="px-5 py-4">القناة المهيمنة</th>
                          <th className="px-5 py-4">إجمالي الإيراد</th>
                          <th className="px-5 py-4">التكاليف التقديرية</th>
                          <th className="px-5 py-4">صافي الأرباح</th>
                          <th className="px-5 py-4 text-left">هامش الربحية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                        {(data.profitability || []).map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-4 font-bold text-gray-900">{row.name}</td>
                            <td className="px-5 py-4 text-gray-500">{row.platform}</td>
                            <td className="px-5 py-4 text-gray-900">{row.revenue}</td>
                            <td className="px-5 py-4 text-rose-600">{row.cost}</td>
                            <td className="px-5 py-4 text-emerald-600 font-bold">{row.profit}</td>
                            <td className="px-5 py-4 text-left">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                row.status === "high" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                              }`}>
                                {row.margin}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "crm" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Tab Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">توقعات المبيعات وعلاقات العملاء</h2>
                  <p className="text-xs text-gray-500 mt-0.5">تحليل تدفق صفقات المبيعات النشطة واحتمالية الإقفال المالي للحجوزات</p>
                </div>

                {/* Sales Funnel and Recent Deals */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pipeline Stages */}
                  <div className="lg:col-span-2 border border-gray-100 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">قمع المبيعات ومراحل الصفقات (Pipeline)</h3>

                    {/* Recharts CRM BarChart */}
                    <div className="w-full h-[220px] pt-2" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart
                            data={(data.crmPipeline || []).map((item: any) => ({
                              name: item.stage.split(" / ")[0],
                              percentage: parseFloat(item.percent.replace("%", "")),
                              valueText: item.value,
                              countText: item.count,
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#334155", fontSize: 10, fontWeight: "bold" }}
                              width={120}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.name}</p>
                                      <p className="text-white">الصفقات: {item.countText}</p>
                                      <p className="text-emerald-400">القيمة الإجمالية: {item.valueText}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={16}>
                              {(data.crmPipeline || []).map((_, index) => {
                                const colors = ["#3b82f6", "#6366f1", "#f59e0b", "#10b981"];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>

                  {/* Recent Active Deals */}
                  <div className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">أحدث صفقات CRM النشطة</h3>

                    <div className="space-y-4 flex-1">
                      {(data.recentDeals || []).map((deal: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-gray-800 truncate max-w-[150px]">{deal.company}</p>
                            <p className="text-gray-500 font-semibold">{deal.price}</p>
                          </div>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            deal.status === "تم التأكيد" ? "bg-emerald-100 text-emerald-800" :
                            deal.status === "بانتظار الدفع" ? "bg-amber-100 text-amber-800" :
                            "bg-blue-100 text-blue-800"
                          }`}>
                            {deal.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "hr" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Tab Header */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900">ملخص الموارد البشرية ومسيرة الرواتب</h2>
                  <p className="text-xs text-gray-500 mt-0.5">إحصاءات الحضور والانصراف، نسب الالتزام، وتفاصيل الأجور المستحقة للشهر الجاري</p>
                </div>

                {/* HR Data */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Payroll Totals */}
                  <div className="border border-gray-150 rounded-2xl p-5 bg-white shadow-sm flex flex-col justify-between space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">مسيرة رواتب الموظفين النشطين</h3>

                    <div className="space-y-3 font-semibold text-xs text-gray-700">
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span>إجمالي الرواتب الأساسية</span>
                        <span>{data.hrPayroll.basic}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50">
                        <span>البدلات والمكافآت المعتمدة</span>
                        <span>{data.hrPayroll.allowances}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-50 text-rose-600">
                        <span>الاستقطاعات والتأمينات التقديرية</span>
                        <span>-{data.hrPayroll.deductions}</span>
                      </div>
                      <div className="flex justify-between py-2 text-sm font-black text-emerald-600">
                        <span>صافي الأجور المستحقة للتحويل</span>
                        <span>{data.hrPayroll.net}</span>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Tracker */}
                  <div className="lg:col-span-2 border border-gray-150 rounded-2xl p-5 bg-white shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-900">معدلات التزام وحضور الموظفين</h3>

                    {/* Recharts HR Attendance BarChart */}
                    <div className="w-full h-[220px] pt-2" style={{ direction: "ltr" }}>
                      {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <BarChart
                            data={(data.employeeAttendance || []).map((emp: any) => ({
                              name: emp.name.split(" (")[0],
                              rate: parseFloat(emp.attend.replace("% حضور", "")),
                              delay: emp.delay,
                            }))}
                            layout="vertical"
                            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis
                              dataKey="name"
                              type="category"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "#334155", fontSize: 10, fontWeight: "bold" }}
                              width={120}
                            />
                            <RechartsTooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0].payload;
                                  return (
                                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-bold space-y-1 text-right dir-rtl">
                                      <p className="text-gray-400">{item.name}</p>
                                      <p className="text-emerald-400">نسبة الالتزام: {item.rate}%</p>
                                      <p className="text-amber-400">الحالة: {item.delay}</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="rate" radius={[0, 8, 8, 0]} barSize={16}>
                              {((data.employeeAttendance || [])).map((entry: any, index: number) => {
                                const rateVal = parseFloat(entry.attend.replace("% حضور", ""));
                                const color = rateVal > 90 ? "#10b981" : "#3b82f6";
                                return <Cell key={`cell-${index}`} fill={color} />;
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Footer */}
        <div className="border-t border-gray-100 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>لوحة البيانات متصلة بقاعدة بيانات Rentals وقاعدة بيانات ERP الموحدة مباشرة.</span>
          </div>
          <span>برنامج لوحة تحليلات NestedUnited ERP</span>
        </div>
      </div>
    </div>
  );
}
