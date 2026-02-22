import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import Link from "next/link";
import {
    Users,
    Clock,
    FileText,
    AlertCircle,
    CheckCircle,
    XCircle,
    TrendingUp,
    Calendar,
    Megaphone,
} from "lucide-react";

async function getHRStats() {
    const today = new Date().toISOString().split("T")[0];

    // إحصائيات الموظفين
    const employeeStats = await queryOne<{ total: number; active: number }>(
        `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
    FROM hr_employees`
    );

    // إحصائيات الحضور اليوم - تحسين المنطق
    // الغياب هو الموظفين الذين ليس لديهم سجل حضور اليوم، وحالتهم نشطة، وليسوا في إجازة
    // ولكن للتبسيط هنا سنعتمد على جدول الحضور إذا كان يتم إنشاؤه تلقائياً (Cron Job) أو نعتمد على المسجلين فقط
    // حالياً النظام يعتمد على أن "Absent" يتم تسجيله يدوياً أو عبر Cron Job. 
    // إذا لم يوجد Cron Job، فالغياب هو (إجمالي النشطين - الحضور - الإجازات المعتمدة اليوم)

    // سنقوم بجلب الأرقام بدقة أكبر

    // 1. عدد الموظفين النشطين
    const activeEmployeesCount = employeeStats?.active || 0;

    // 2. سجلات الحضور الموجودة اليوم
    const todaysRecords = await query<any>(
        `SELECT status FROM hr_attendance WHERE date = ?`,
        [today]
    );

    let present = 0;
    let late = 0;
    let leaves = 0; // إجازات مسجلة في الحضور أو الطلبات

    // التحقق من الطلبات المعتمدة اليوم (إجازات)
    // التي قد لا تكون في جدول الحضور بعد
    const approvedLeavesToday = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM hr_requests 
         WHERE status = 'approved' 
         AND request_type IN ('annual_leave', 'sick_leave', 'unpaid_leave', 'other')
         AND ? BETWEEN start_date AND end_date`,
        [today]
    );

    const leaveCountFromRequests = approvedLeavesToday?.count || 0;

    // حساب الحضور والتأخير من السجلات الفعلية
    if (todaysRecords) {
        todaysRecords.forEach((rec: any) => {
            if (rec.status === 'present') present++;
            if (rec.status === 'late') {
                late++;
                present++; // المتأخر يعتبر حاضر
            }
            if (rec.status === 'leave' || rec.status === 'holiday') leaves++;
        });
    }

    // الغائبين = (النشطين) - (الحاضرين + المتأخرين) - (المجازين فعلياً)
    // سنفترض أن leaveCountFromRequests يغطي الإجازات، إلا إذا تم تسجيلها في Attendance
    // لتجنب التكرار، نعتمد الأكبر أو ندمج إذا كان النظام ينشئ سجلات تلقائية.
    // للتبسيط الآن:
    const totalAccountedFor = present + (Math.max(leaves, leaveCountFromRequests));
    const absent = Math.max(0, activeEmployeesCount - totalAccountedFor);

    const attendanceStats = {
        present: present,
        late: late,
        absent: absent,
        leaves: Math.max(leaves, leaveCountFromRequests)
    };

    // الطلبات المعلقة
    const pendingRequests = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM hr_requests WHERE status = 'pending'`
    );

    // أحدث الإعلانات
    const announcements = await query<any>(
        `SELECT * FROM hr_announcements 
     WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY is_pinned DESC, published_at DESC LIMIT 3`
    );

    return {
        employees: employeeStats || { total: 0, active: 0 },
        attendance: attendanceStats || { present: 0, absent: 0, late: 0 },
        pendingRequests: pendingRequests?.count || 0,
        announcements: announcements || [],
    };
}

export default async function HRDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const stats = await getHRStats();
    const today = new Date().toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم الموارد البشرية</h1>
                <p className="text-gray-500 mt-1">{today}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* الموظفين */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">إجمالي الموظفين</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.employees.total}</p>
                            <p className="text-sm text-green-600 mt-1">
                                {stats.employees.active} نشط
                            </p>
                        </div>
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                            <Users className="w-7 h-7 text-violet-600" />
                        </div>
                    </div>
                </div>

                {/* الحضور اليوم */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">الحضور اليوم</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.attendance.present || 0}</p>
                            <div className="flex items-center gap-3 mt-1 text-sm">
                                <span className="text-red-600 font-medium">{stats.attendance.absent || 0} غائب</span>
                                <span className="text-yellow-600 font-medium">{stats.attendance.late || 0} متأخر</span>
                                {stats.attendance.leaves > 0 && (
                                    <span className="text-blue-600 font-medium">{stats.attendance.leaves} مجاز</span>
                                )}
                            </div>
                        </div>
                        <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                            <Clock className="w-7 h-7 text-green-600" />
                        </div>
                    </div>
                </div>

                {/* الطلبات المعلقة */}
                <Link href="/hr/requests" className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">طلبات معلقة</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.pendingRequests}</p>
                            <p className="text-sm text-blue-600 mt-1">انقر للمراجعة</p>
                        </div>
                        <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                            <FileText className="w-7 h-7 text-orange-600" />
                        </div>
                    </div>
                </Link>

                {/* معدل الحضور */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">معدل الحضور</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                                {stats.employees.active > 0
                                    ? Math.round(((stats.attendance.present || 0) / stats.employees.active) * 100)
                                    : 0}%
                            </p>
                            <p className="text-sm text-gray-500 mt-1">هذا اليوم</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <TrendingUp className="w-7 h-7 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h2>
                    <div className="space-y-3">
                        <Link
                            href="/hr/employees/new"
                            className="flex items-center gap-3 p-4 bg-violet-50 rounded-xl hover:bg-violet-100 transition"
                        >
                            <Users className="w-5 h-5 text-violet-600" />
                            <span className="text-violet-900 font-medium">إضافة موظف جديد</span>
                        </Link>
                        <Link
                            href="/hr/attendance"
                            className="flex items-center gap-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition"
                        >
                            <Clock className="w-5 h-5 text-green-600" />
                            <span className="text-green-900 font-medium">سجل الحضور اليومي</span>
                        </Link>
                        <Link
                            href="/hr/payroll/new"
                            className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
                        >
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span className="text-blue-900 font-medium">إنشاء مسير رواتب</span>
                        </Link>
                    </div>
                </div>

                {/* Announcements */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">أحدث الإعلانات</h2>
                        <Link href="/hr/announcements" className="text-violet-600 text-sm hover:underline">
                            عرض الكل
                        </Link>
                    </div>

                    {stats.announcements.length > 0 ? (
                        <div className="space-y-4">
                            {stats.announcements.map((ann: any) => (
                                <div
                                    key={ann.id}
                                    className={`p-4 rounded-xl border-r-4 ${ann.priority === "urgent"
                                        ? "bg-red-50 border-red-500"
                                        : ann.priority === "high"
                                            ? "bg-orange-50 border-orange-500"
                                            : "bg-gray-50 border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                                            <p className="text-gray-600 text-sm mt-1 line-clamp-2">{ann.content}</p>
                                        </div>
                                        {ann.is_pinned && (
                                            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded">
                                                مثبت
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>لا توجد إعلانات حالياً</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
