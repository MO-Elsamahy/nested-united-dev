
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getEmployeeHistory(userId: string) {
    const employee = await queryOne<any>(
        "SELECT id FROM hr_employees WHERE user_id = ?",
        [userId]
    );

    if (!employee) return null;

    // Get attendance for the last 30 days
    // We can improved this to be by month later
    const history = await query<any>(`
        SELECT * FROM hr_attendance 
        WHERE employee_id = ? 
        ORDER BY date DESC 
        LIMIT 30
    `, [employee.id]);

    return history || [];
}

export default async function AttendanceHistoryPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const history = await getEmployeeHistory(session.user.id);

    if (!history) {
        return (
            <div className="p-8 text-center">
                <p>لم يتم العثور على سجل موظف.</p>
            </div>
        );
    }

    const formatTime = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("ar-EG", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getStatusBadge = (record: any) => {
        if (record.status === "absent") {
            return <span className="text-red-600 flex items-center gap-1 text-sm"><XCircle className="w-4 h-4" /> غائب</span>;
        }
        if (record.status === "late") {
            return <span className="text-yellow-600 flex items-center gap-1 text-sm"><Clock className="w-4 h-4" /> متأخر ({record.late_minutes}د)</span>;
        }
        if (record.status === "leave") {
            return <span className="text-blue-600 flex items-center gap-1 text-sm"><Calendar className="w-4 h-4" /> إجازة</span>;
        }
        return <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle className="w-4 h-4" /> حاضر</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/employee" className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <ArrowRight className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">سجل الحضور</h1>
                    <p className="text-gray-500">سجل الحضور والانصراف لآخر 30 يوم</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">التاريخ</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">الحالة</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">دخول</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">خروج</th>
                                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500">تأخير/إضافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {history.length > 0 ? (
                                history.map((record: any) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {formatDate(record.date)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(record)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-gray-600">
                                            {formatTime(record.check_in)}
                                        </td>
                                        <td className="px-6 py-4 text-center font-mono text-gray-600">
                                            {formatTime(record.check_out)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm">
                                            {record.late_minutes > 0 && (
                                                <span className="text-red-600 ml-2">تأخير {record.late_minutes}د</span>
                                            )}
                                            {record.overtime_minutes > 0 && (
                                                <span className="text-green-600">إضافي {record.overtime_minutes}د</span>
                                            )}
                                            {record.late_minutes === 0 && record.overtime_minutes === 0 && (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        لا يوجد سجلات حضور حتى الآن
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
