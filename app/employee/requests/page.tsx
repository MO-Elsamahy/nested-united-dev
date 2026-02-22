
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { queryOne, query } from "@/lib/db";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus, FileText, CheckCircle, XCircle, AlertCircle, Calendar, ArrowRight } from "lucide-react";

async function getMyRequests(userId: string) {
    const employee = await queryOne<any>(
        "SELECT id FROM hr_employees WHERE user_id = ?",
        [userId]
    );

    if (!employee) return [];

    const requests = await query<any>(
        `SELECT * FROM hr_requests WHERE employee_id = ? ORDER BY created_at DESC`,
        [employee.id]
    );

    return requests || [];
}

export default async function EmployeeRequestsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const requests = await getMyRequests(session.user.id);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs"><CheckCircle className="w-3 h-3" /> مقبول</span>;
            case "rejected":
                return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs"><XCircle className="w-3 h-3" /> مرفوض</span>;
            case "pending":
                return <span className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs"><AlertCircle className="w-3 h-3" /> قيد المراجعة</span>;
            default:
                return <span className="text-gray-500">{status}</span>;
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/employee" className="p-2 hover:bg-gray-100 rounded-lg transition">
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">طلباتي</h1>
                        <p className="text-gray-500">متابعة حالة الطلبات والإجازات</p>
                    </div>
                </div>
                <Link
                    href="/employee/requests/new"
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-violet-200"
                >
                    <Plus className="w-5 h-5" />
                    <span>طلب جديد</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {requests.length > 0 ? (
                    <div className="divide-y">
                        {requests.map((req: any) => (
                            <div key={req.id} className="p-6 hover:bg-gray-50 transition">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${req.request_type.includes('leave') ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'
                                            }`}>
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg">{getRequestType(req.request_type)}</p>
                                            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>
                                                    {new Date(req.start_date).toLocaleDateString("ar-EG")}
                                                    {req.end_date && req.end_date !== req.start_date &&
                                                        ` - ${new Date(req.end_date).toLocaleDateString("ar-EG")}`
                                                    }
                                                </span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{req.days_count} يوم</span>
                                            </div>
                                            {req.reason && (
                                                <p className="text-gray-600 mt-2 text-sm bg-gray-50 p-2 rounded-lg inline-block">
                                                    {req.reason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="mb-2">{getStatusBadge(req.status)}</div>
                                        <p className="text-xs text-gray-400">
                                            {new Date(req.created_at).toLocaleDateString("ar-EG")}
                                        </p>
                                    </div>
                                </div>
                                {req.reviewer_notes && (
                                    <div className="mt-4 mr-16 bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-100">
                                        <strong>ملاحظات المدير:</strong> {req.reviewer_notes}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                        <h3 className="text-lg font-medium text-gray-900">لا توجد طلبات</h3>
                        <p>لم تقم بتقديم أي طلبات حتى الآن</p>
                    </div>
                )}
            </div>
        </div>
    );
}
