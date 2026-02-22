import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Shield, User as UserIcon, Plus, Wrench, Calculator, Users as UsersIcon } from "lucide-react";
import Link from "next/link";
import { ToggleUserButton } from "@/app/dashboard/users/ToggleUserButton";
import { ChangePasswordButton } from "@/app/dashboard/users/ChangePasswordButton";
import { EditUserButton } from "@/app/dashboard/users/EditUserButton";
import { DeleteUserButton } from "@/app/dashboard/users/DeleteUserButton";

interface DBUser {
    id: string;
    email: string;
    name: string;
    role: string;
    is_active: boolean | number;
    created_at: string;
}

async function checkSuperAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return false;

    const user = await queryOne<{ role: string }>(
        "SELECT role FROM users WHERE id = ?",
        [session.user.id]
    );

    return user?.role === "super_admin";
}

async function getUsers() {
    const users = await query<DBUser>(
        "SELECT * FROM users ORDER BY created_at DESC"
    );
    return users.map((u) => ({
        ...u,
        is_active: u.is_active === 1 || u.is_active === true,
    }));
}

const roleLabel = (role: string) => {
    switch (role) {
        case 'super_admin': return 'مدير عام';
        case 'admin': return 'مشرف';
        case 'accountant': return 'محاسب';
        case 'hr_manager': return 'موارد بشرية';
        case 'reception': return 'استقبال';
        case 'maintenance_worker': return 'صيانة';
        case 'employee': return 'موظف';
        default: return role;
    }
}

const roleIcon = (role: string) => {
    switch (role) {
        case 'super_admin': return <Shield className="w-5 h-5 text-purple-600" />;
        case 'accountant': return <Calculator className="w-5 h-5 text-emerald-600" />;
        case 'hr_manager': return <UsersIcon className="w-5 h-5 text-violet-600" />;
        case 'maintenance_worker': return <Wrench className="w-5 h-5 text-orange-600" />;
        case 'employee': return <UserIcon className="w-5 h-5 text-gray-600" />;
        default: return <UserIcon className="w-5 h-5 text-blue-600" />;
    }
}

export default async function SettingsUsersPage() {
    const isSuperAdmin = await checkSuperAdmin();
    if (!isSuperAdmin) {
        redirect("/portal");
    }

    const users = await getUsers();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين والصلاحيات</h1>
                    <p className="text-gray-600 mt-1">تحكم في من يمكنه الوصول لكل نظام</p>
                </div>
                <Link
                    href="/settings/users/new"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>إضافة مستخدم</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b text-sm text-gray-600 font-medium">
                        <tr>
                            <th className="px-6 py-4">المستخدم</th>
                            <th className="px-6 py-4">الدور</th>
                            <th className="px-6 py-4">الحالة</th>
                            <th className="px-6 py-4 text-left">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                            {roleIcon(user.role)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.name}</p>
                                            <p className="text-gray-500 text-sm">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">{roleLabel(user.role)}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.is_active ? (
                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">نشط</span>
                                    ) : (
                                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">معطل</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 justify-end">
                                        <EditUserButton userId={user.id} userName={user.name} userEmail={user.email} userRole={user.role} />
                                        <ChangePasswordButton userId={user.id} userEmail={user.email} />
                                        <ToggleUserButton id={user.id} isActive={user.is_active} />
                                        <DeleteUserButton userId={user.id} userName={user.name} userEmail={user.email} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
