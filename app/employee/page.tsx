import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import Link from "next/link";
import {
    Clock,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Calendar,
    Megaphone,
} from "lucide-react";
import { AttendanceButton } from "./AttendanceButton";

async function getEmployeeData(userId: string) {
    // Get employee record linked to this user
    const employee = await queryOne<any>(
        `SELECT * FROM hr_employees WHERE user_id = ? AND status = 'active'`,
        [userId]
    );

    if (!employee) return null;

    const today = new Date().toISOString().split("T")[0];

    // Get today's attendance
    const todayAttendance = await queryOne<any>(
        `SELECT * FROM hr_attendance WHERE employee_id = ? AND date = ?`,
        [employee.id, today]
    );

    // Get pending requests count
    const pendingRequests = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM hr_requests WHERE employee_id = ? AND status = 'pending'`,
        [employee.id]
    );

    // Get recent requests
    const recentRequests = await query<any>(
        `SELECT * FROM hr_requests WHERE employee_id = ? ORDER BY created_at DESC LIMIT 3`,
        [employee.id]
    );

    // Get active announcements
    const announcements = await query<any>(
        `SELECT * FROM hr_announcements 
     WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY is_pinned DESC, published_at DESC LIMIT 3`
    );

    return {
        employee,
        todayAttendance,
        pendingRequests: pendingRequests?.count || 0,
        recentRequests: recentRequests || [],
        announcements: announcements || [],
    };
}

export default async function EmployeeDashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const data = await getEmployeeData(session.user.id);

    if (!data) {
        return (
            <div className="text-center py-16">
                <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">لا يوجد ملف موظف</h2>
                <p className="text-gray-500">
                    حسابك غير مرتبط بملف موظف. يرجى التواصل مع قسم الموارد البشرية.
                </p>
            </div>
        );
    }

    const { employee, todayAttendance, pendingRequests, recentRequests, announcements } = data;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> مقبول</span>;
            case "rejected":
                return <span className="flex items-center gap-1 text-red-600 text-sm"><XCircle className="w-4 h-4" /> مرفوض</span>;
            case "pending":
                return <span className="flex items-center gap-1 text-yellow-600 text-sm"><AlertCircle className="w-4 h-4" /> قيد المراجعة</span>;
            default:
                return <span className="text-gray-500 text-sm">{status}</span>;
        }
    };

    const getRequestType = (type: string) => {
        const types: Record<string, string> = {
            annual_leave: "إجازة سنوية",
            sick_leave: "إجازة مرضية",
            unpaid_leave: "إجازة بدون راتب",
            shift_swap: "تبديل شيفت",
            overtime: "إضافي",
            other: "أخرى",
        };
        return types[type] || type;
    };

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="bg-gradient-to-l from-violet-600 to-violet-800 rounded-2xl p-8 text-white shadow-xl">
                <h1 className="text-2xl font-bold">مرحباً، {employee.full_name}</h1>
                <p className="text-violet-200 mt-1">{employee.job_title} - {employee.department}</p>

                <div className="mt-6 flex flex-wrap gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                        <p className="text-violet-200 text-xs">رصيد الإجازات السنوية</p>
                        <p className="text-2xl font-bold">{employee.annual_leave_balance} يوم</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                        <p className="text-violet-200 text-xs">رصيد الإجازات المرضية</p>
                        <p className="text-2xl font-bold">{employee.sick_leave_balance} يوم</p>
                    </div>
                </div>
            </div>

            {/* Attendance Button */}
            <AttendanceButton
                employeeId={employee.id}
                todayAttendance={todayAttendance}
            />

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Requests */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">آخر الطلبات</h2>
                        <Link href="/employee/requests" className="text-violet-600 text-sm hover:underline">
                            عرض الكل
                        </Link>
                    </div>

                    {recentRequests.length > 0 ? (
                        <div className="space-y-3">
                            {recentRequests.map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-900">{getRequestType(req.request_type)}</p>
                                        <p className="text-gray-500 text-sm">
                                            {new Date(req.start_date).toLocaleDateString("ar-EG")}
                                            {req.end_date && req.end_date !== req.start_date &&
                                                ` - ${new Date(req.end_date).toLocaleDateString("ar-EG")}`
                                            }
                                        </p>
                                    </div>
                                    {getStatusBadge(req.status)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p>لا توجد طلبات</p>
                        </div>
                    )}

                    <Link
                        href="/employee/requests/new"
                        className="mt-4 block w-full text-center bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-medium transition"
                    >
                        تقديم طلب جديد
                    </Link>
                </div>

                {/* Announcements */}
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900">الإعلانات</h2>
                        <Megaphone className="w-5 h-5 text-gray-400" />
                    </div>

                    {announcements.length > 0 ? (
                        <div className="space-y-4">
                            {announcements.map((ann: any) => (
                                <div
                                    key={ann.id}
                                    className={`p-4 rounded-xl border-r-4 ${ann.priority === "urgent"
                                        ? "bg-red-50 border-red-500"
                                        : ann.priority === "high"
                                            ? "bg-orange-50 border-orange-500"
                                            : "bg-gray-50 border-violet-300"
                                        }`}
                                >
                                    <h3 className="font-semibold text-gray-900">{ann.title}</h3>
                                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{ann.content}</p>
                                    <p className="text-gray-400 text-xs mt-2">
                                        {ann.published_at && new Date(ann.published_at).toLocaleDateString("ar-EG")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Megaphone className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                            <p>لا توجد إعلانات</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
