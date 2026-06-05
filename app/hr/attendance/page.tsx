import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Link from "next/link";
import { Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";
import { Attendance } from "@/lib/types/hr";
import { DateSelector } from "./DateSelector";

interface AttendanceWithEmployee extends Partial<Attendance> {
    id: string;
    full_name: string;
    department?: string | null;
    job_title?: string | null;
    days_off?: string | null;
}

async function getAttendanceData(dateStr: string) {
    // Get all active employees with their attendance on selected date
    const data = await query<AttendanceWithEmployee>(`
    SELECT 
      e.id,
      e.full_name,
      e.department,
      e.job_title,
      s.days_off,
      a.check_in,
      a.check_out,
      a.status,
      a.late_minutes,
      a.overtime_minutes
    FROM hr_employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN hr_attendance a ON e.id = a.employee_id AND a.date = ?
    LEFT JOIN hr_shifts s ON e.shift_id = s.id
    WHERE e.status = 'active' 
    AND (u.role IS NULL OR u.role NOT IN ('super_admin', 'accountant'))
    ORDER BY a.check_in IS NULL DESC, a.check_in ASC
  `, [dateStr]);

    return data || [];
}

export default async function AttendancePage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const resolvedSearchParams = await searchParams;
    const selectedDateStr = resolvedSearchParams.date || new Date().toISOString().split("T")[0];

    const employees = await getAttendanceData(selectedDateStr);

    const [yr, mo, dy] = selectedDateStr.split("-").map(Number);
    const dateObj = new Date(yr, mo - 1, dy);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const formattedDate = dateObj.toLocaleDateString("ar-SA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const employeesWithStatus = employees.map((emp) => {
        let calculatedStatus: "present" | "absent" | "late" | "on_leave" | "day_off" = (emp.status as any) || "absent";
        if (!emp.check_in) {
            let daysOffList: number[] = [];
            if (emp.days_off) {
                daysOffList = emp.days_off.split(",").map(Number);
            } else {
                // Default day off is Friday (5) for employees without shift_id
                daysOffList = [5];
            }
            if (daysOffList.includes(dayOfWeek)) {
                calculatedStatus = "day_off";
            } else {
                calculatedStatus = "absent";
            }
        }
        return {
            ...emp,
            calculatedStatus,
        };
    });

    const stats = {
        total: employeesWithStatus.length,
        present: employeesWithStatus.filter((e) => e.check_in).length,
        absent: employeesWithStatus.filter((e) => e.calculatedStatus === "absent").length,
        late: employeesWithStatus.filter((e) => e.calculatedStatus === "late").length,
        dayOff: employeesWithStatus.filter((e) => e.calculatedStatus === "day_off").length,
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (emp: typeof employeesWithStatus[number]) => {
        if (emp.calculatedStatus === "day_off") {
            return (
                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-200/60 px-2 py-1 rounded text-[11px] font-bold">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> إجازة أسبوعية
                </span>
            );
        }
        if (!emp.check_in) {
            return (
                <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded text-[11px] font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> غائب
                </span>
            );
        }
        if (emp.status === "late") {
            return (
                <span className="inline-flex items-center gap-1 text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-1 rounded text-[11px] font-bold">
                    <Clock className="w-3.5 h-3.5 text-yellow-500" /> متأخر {emp.late_minutes} د
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 border border-green-100 px-2 py-1 rounded text-[11px] font-bold">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> حاضر
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل الحضور والانصراف</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-500 text-sm">{formattedDate}</p>
                        <span className="text-gray-300">|</span>
                        <DateSelector currentDate={selectedDateStr} />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/hr/shifts"
                        className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm text-sm font-semibold"
                    >
                        <Clock className="w-4 h-4 text-violet-600" />
                        <span>إدارة الورديات</span>
                    </Link>
                    <Link
                        href="/hr/attendance/reports"
                        className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm text-sm font-semibold"
                    >
                        <Calendar className="w-4 h-4 text-violet-600" />
                        <span>التقارير الشهرية</span>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <p className="text-gray-500 text-sm">إجمالي الموظفين</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                    <p className="text-green-700 text-sm">حاضرين</p>
                    <p className="text-3xl font-bold text-green-700 mt-1">{stats.present}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                    <p className="text-red-700 text-sm">غائبين</p>
                    <p className="text-3xl font-bold text-red-700 mt-1">{stats.absent}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
                    <p className="text-yellow-700 text-sm">متأخرين</p>
                    <p className="text-3xl font-bold text-yellow-700 mt-1">{stats.late}</p>
                </div>
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
                    <p className="text-slate-600 text-sm">إجازة أسبوعية</p>
                    <p className="text-3xl font-bold text-slate-700 mt-1">{stats.dayOff}</p>
                </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">الموظف</th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">القسم</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحالة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحضور</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الانصراف</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">إضافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {employeesWithStatus.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold">
                                                {emp.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{emp.full_name}</p>
                                                <p className="text-gray-500 text-sm">{emp.job_title}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{emp.department || "—"}</td>
                                    <td className="px-6 py-4 text-center">{getStatusBadge(emp)}</td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-900">
                                        {formatTime(emp.check_in || null)}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-900">
                                        {formatTime(emp.check_out || null)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {(emp.overtime_minutes || 0) > 0 ? (
                                            <span className="text-blue-600 font-medium">{emp.overtime_minutes} د</span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
