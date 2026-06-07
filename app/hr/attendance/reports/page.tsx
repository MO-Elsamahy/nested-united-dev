
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Download, Calendar, CalendarDays, CalendarRange } from "lucide-react";

// ─── Types ───
interface MonthlyRow {
    id: string; full_name: string; department: string; job_title: string;
    working_days: number; off_days: number;
    present_days: number; absent_days: number; leave_days: number;
    total_late_minutes: number; total_overtime_minutes: number;
    attendance_rate: number;
}

interface DailyRow {
    id: string; full_name: string; department: string; job_title: string;
    date: string; status: string;
    check_in: string | null; check_out: string | null;
    late_minutes: number; overtime_minutes: number;
}

interface WeeklyRow {
    id: string; full_name: string; department: string; job_title: string;
    present_days: number; absent_days: number; leave_days: number; off_days: number;
    total_late_minutes: number; total_overtime_minutes: number;
    days: { date: string; status: string }[];
}

// ─── Helpers ───
const MONTHS = ["يناير","فبراير","مارس","إبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function fmtMinutes(mins: number) {
    if (!mins) return "—";
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        present: { label: "حاضر",   cls: "bg-green-100 text-green-700" },
        late:    { label: "متأخر",  cls: "bg-yellow-100 text-yellow-700" },
        absent:  { label: "غائب",   cls: "bg-red-100 text-red-700" },
        leave:   { label: "إجازة",  cls: "bg-blue-100 text-blue-700" },
        off:     { label: "راحة",   cls: "bg-gray-100 text-gray-500" },
        pending: { label: "لم يبدأ",cls: "bg-gray-50 text-gray-400" },
    };
    const s = map[status] || { label: status, cls: "bg-gray-100 text-gray-500" };
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function RateBadge({ rate }: { rate: number }) {
    const cls = rate >= 85 ? "bg-green-100 text-green-700" : rate >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700";
    return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{rate}%</span>;
}

// ─── Main Page ───
export default function AttendanceReportsPage() {
    const [view, setView]   = useState<"monthly" | "weekly" | "daily">("monthly");
    const [loading, setLoading] = useState(true);

    // Monthly filters
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear]   = useState(new Date().getFullYear());

    // Daily filter
    const [date, setDate]   = useState(new Date().toISOString().split("T")[0]);

    // Weekly filter
    const getWeekRange = () => {
        const to   = new Date(); to.setDate(to.getDate() - 1);
        const from = new Date(to); from.setDate(from.getDate() - 6);
        return { from: from.toISOString().split("T")[0], to: to.toISOString().split("T")[0] };
    };
    const wr = getWeekRange();
    const [weekFrom, setWeekFrom] = useState(wr.from);
    const [weekTo,   setWeekTo]   = useState(wr.to);

    const [department, setDepartment] = useState("");

    // Data
    const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([]);
    const [dailyData,   setDailyData]   = useState<{ date: string; rows: DailyRow[] } | null>(null);
    const [weeklyData,  setWeeklyData]  = useState<{ date_from: string; date_to: string; rows: WeeklyRow[] } | null>(null);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ view, department });
            if (view === "monthly") { params.set("month", String(month)); params.set("year", String(year)); }
            if (view === "daily")   { params.set("date", date); }
            if (view === "weekly")  { params.set("date_from", weekFrom); params.set("date_to", weekTo); }

            const res  = await fetch(`/api/hr/attendance/reports?${params}`);
            const data = await res.json();

            if (view === "monthly") setMonthlyData(Array.isArray(data) ? data : []);
            if (view === "daily")   setDailyData(data?.rows ? data : null);
            if (view === "weekly")  setWeeklyData(data?.rows ? data : null);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [view, month, year, date, weekFrom, weekTo, department]);

    useEffect(() => { void fetchReport(); }, [fetchReport]);

    // ─── Tabs ───
    const tabs = [
        { key: "monthly" as const, label: "شهري",    icon: CalendarRange },
        { key: "weekly"  as const, label: "أسبوعي",  icon: CalendarDays },
        { key: "daily"   as const, label: "يومي",    icon: Calendar },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/hr/attendance" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">تقارير الحضور</h1>
                    <p className="text-gray-500 text-sm mt-0.5">ملخص حضور وغياب الموظفين</p>
                </div>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                    <Download className="w-4 h-4" /> طباعة
                </button>
            </div>

            {/* View Tabs */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setView(key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                            view === key ? "bg-white shadow text-violet-700" : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        <Icon className="w-4 h-4" /> {label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-wrap gap-4 items-end">
                {view === "monthly" && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">الشهر</label>
                            <select value={month} onChange={(e) => setMonth(+e.target.value)} className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-violet-500">
                                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">السنة</label>
                            <select value={year} onChange={(e) => setYear(+e.target.value)} className="px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-violet-500">
                                {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </>
                )}
                {view === "daily" && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
                    </div>
                )}
                {view === "weekly" && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">من</label>
                            <input type="date" value={weekFrom} onChange={(e) => setWeekFrom(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">إلى</label>
                            <input type="date" value={weekTo} onChange={(e) => setWeekTo(e.target.value)} className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
                        </div>
                    </>
                )}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">القسم</label>
                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="بحث بالقسم..." className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-violet-500" />
                </div>
            </div>

            {/* ── MONTHLY TABLE ── */}
            {view === "monthly" && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">الموظف</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">أيام العمل</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الراحة</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الحضور</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الغياب</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الإجازات</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">التأخير</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الإضافي</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">نسبة الحضور</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">جاري التحميل...</td></tr>
                                ) : monthlyData.length === 0 ? (
                                    <tr><td colSpan={9} className="text-center py-12 text-gray-400">لا توجد بيانات</td></tr>
                                ) : monthlyData.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900">{r.full_name}</p>
                                            <p className="text-xs text-gray-400">{r.department} — {r.job_title}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium text-gray-700">{r.working_days}</td>
                                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">{r.off_days}</span></td>
                                        <td className="px-4 py-3 text-center"><span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">{r.present_days}</span></td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-3 py-1 rounded-full font-medium ${r.absent_days > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-400"}`}>{r.absent_days}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-indigo-600">{r.leave_days > 0 ? r.leave_days : "—"}</td>
                                        <td className="px-4 py-3 text-center font-mono"><span className={r.total_late_minutes > 0 ? "text-yellow-600 font-bold" : "text-gray-300"}>{fmtMinutes(r.total_late_minutes)}</span></td>
                                        <td className="px-4 py-3 text-center font-mono"><span className={r.total_overtime_minutes > 0 ? "text-blue-600 font-bold" : "text-gray-300"}>{fmtMinutes(r.total_overtime_minutes)}</span></td>
                                        <td className="px-4 py-3 text-center"><RateBadge rate={r.attendance_rate} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── DAILY TABLE ── */}
            {view === "daily" && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                        <p className="font-medium text-gray-700">تقرير يوم {dailyData?.date || date}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">الموظف</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الحالة</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">وقت الحضور</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">وقت الانصراف</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">التأخير</th>
                                    <th className="text-center px-4 py-3 font-medium text-gray-600">الإضافي</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">جاري التحميل...</td></tr>
                                ) : !dailyData?.rows?.length ? (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">لا توجد بيانات</td></tr>
                                ) : dailyData.rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-900">{r.full_name}</p>
                                            <p className="text-xs text-gray-400">{r.department} — {r.job_title}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                                        <td className="px-4 py-3 text-center font-mono text-sm">{r.check_in ? r.check_in.slice(11, 16) : "—"}</td>
                                        <td className="px-4 py-3 text-center font-mono text-sm">{r.check_out ? r.check_out.slice(11, 16) : "—"}</td>
                                        <td className="px-4 py-3 text-center font-mono"><span className={r.late_minutes > 0 ? "text-yellow-600 font-bold" : "text-gray-300"}>{fmtMinutes(r.late_minutes)}</span></td>
                                        <td className="px-4 py-3 text-center font-mono"><span className={r.overtime_minutes > 0 ? "text-blue-600 font-bold" : "text-gray-300"}>{fmtMinutes(r.overtime_minutes)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── WEEKLY TABLE ── */}
            {view === "weekly" && weeklyData?.rows && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600 sticky right-0 bg-gray-50">الموظف</th>
                                    {weeklyData.rows[0]?.days.map((d) => (
                                        <th key={d.date} className="text-center px-3 py-3 font-medium text-gray-600 whitespace-nowrap min-w-[80px]">
                                            <div>{new Date(d.date).toLocaleDateString("ar-SA", { weekday: "short" })}</div>
                                            <div className="text-xs text-gray-400">{d.date.slice(5)}</div>
                                        </th>
                                    ))}
                                    <th className="text-center px-3 py-3 font-medium text-gray-600">حضور</th>
                                    <th className="text-center px-3 py-3 font-medium text-gray-600">غياب</th>
                                    <th className="text-center px-3 py-3 font-medium text-gray-600">تأخير</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan={20} className="text-center py-12 text-gray-400">جاري التحميل...</td></tr>
                                ) : weeklyData.rows.map((r) => (
                                    <tr key={r.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 sticky right-0 bg-white">
                                            <p className="font-semibold text-gray-900 whitespace-nowrap">{r.full_name}</p>
                                            <p className="text-xs text-gray-400">{r.department}</p>
                                        </td>
                                        {r.days.map((d) => (
                                            <td key={d.date} className="px-3 py-3 text-center">
                                                <StatusBadge status={d.status} />
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-center"><span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">{r.present_days}</span></td>
                                        <td className="px-3 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.absent_days > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-400"}`}>{r.absent_days}</span></td>
                                        <td className="px-3 py-3 text-center font-mono text-xs"><span className={r.total_late_minutes > 0 ? "text-yellow-600" : "text-gray-300"}>{fmtMinutes(r.total_late_minutes)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
