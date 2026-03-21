import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import Link from "next/link";
import { Clock, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

async function getAttendanceData() {
    const today = new Date().toISOString().split("T")[0];

    // Get all active employees with their attendance today
    const data = await query<any>(`
    SELECT 
      e.id,
      e.full_name,
      e.department,
      e.job_title,
      a.check_in,
      a.check_out,
      a.status,
      a.late_minutes,
      a.overtime_minutes
    FROM hr_employees e
    LEFT JOIN users u ON e.user_id = u.id
    LEFT JOIN hr_attendance a ON e.id = a.employee_id AND a.date = ?
    WHERE e.status = 'active' 
    AND (u.role IS NULL OR u.role NOT IN ('super_admin', 'accountant'))
    ORDER BY a.check_in IS NULL DESC, a.check_in ASC
  `, [today]);

    return data || [];
}

export default async function AttendancePage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const employees = await getAttendanceData();
    const today = new Date().toLocaleDateString("ar-SA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const stats = {
        total: employees.length,
        present: employees.filter((e: any) => e.check_in).length,
        absent: employees.filter((e: any) => !e.check_in).length,
        late: employees.filter((e: any) => e.status === "late").length,
    };

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusBadge = (emp: any) => {
        if (!emp.check_in) {
            return (
                <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs">
                    <AlertTriangle className="w-3 h-3" /> غائب
                </span>
            );
        }
        if (emp.status === "late") {
            return (
                <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
                    <Clock className="w-3 h-3" /> متأخر {emp.late_minutes} د
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs">
                <CheckCircle className="w-3 h-3" /> حاضر
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل الحضور والانصراف</h1>
                    <p className="text-gray-500">{today}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/hr/shifts"
                        className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm"
                    >
                        <Clock className="w-5 h-5 text-violet-600" />
                        <span>إدارة الورديات</span>
                    </Link>
                    <Link
                        href="/hr/attendance/reports"
                        className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-50 transition shadow-sm"
                    >
                        <Calendar className="w-5 h-5 text-violet-600" />
                        <span>التقارير الشهرية</span>
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                    <p className="text-gray-500 text-sm">إجمالي الموظفين</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-green-50 rounded-xl border border-green-100 p-4">
                    <p className="text-green-700 text-sm">حاضرين</p>
                    <p className="text-3xl font-bold text-green-700">{stats.present}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4">
                    <p className="text-red-700 text-sm">غائبين</p>
                    <p className="text-3xl font-bold text-red-700">{stats.absent}</p>
                </div>
                <div className="bg-yellow-50 rounded-xl border border-yellow-100 p-4">
                    <p className="text-yellow-700 text-sm">متأخرين</p>
                    <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
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
                            {employees.map((emp: any) => (
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
                                        {formatTime(emp.check_in)}
                                    </td>
                                    <td className="px-6 py-4 text-center font-mono text-gray-900">
                                        {formatTime(emp.check_out)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {emp.overtime_minutes > 0 ? (
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
