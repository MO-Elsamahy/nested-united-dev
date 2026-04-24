import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";
import { Shield, User as UserIcon, Plus, Wrench } from "lucide-react";
import Link from "next/link";
import { ToggleUserButton } from "./ToggleUserButton";
import { ChangePasswordButton } from "./ChangePasswordButton";
import { EditPermissionsButton } from "./EditPermissionsButton";
import { EditUserButton } from "./EditUserButton";
import { DeleteUserButton } from "./DeleteUserButton";
import { UserLogsButton } from "./UserLogsButton";

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
    "SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC"
  );
  // Convert MySQL boolean
  return users.map((u) => ({
    ...u,
    is_active: u.is_active === 1 || u.is_active === true,
  }));
}

export default async function UsersPage() {
  const isSuperAdmin = await checkSuperAdmin();
  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  const users = await getUsers();
  const superAdmins = users.filter((u) => u.role === "super_admin");
  const admins = users.filter((u) => u.role === "admin");
  const workers = users.filter((u) => u.role === "maintenance_worker");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إضافة وتعديل المستخدمين</p>
        </div>
        <Link
          href="/dashboard/users/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>إضافة مستخدم</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-blue-500">
          <p className="text-gray-600 text-xs sm:text-sm">إجمالي المستخدمين</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-purple-500">
          <p className="text-gray-600 text-xs sm:text-sm">مدراء عامون</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{superAdmins.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-green-500">
          <p className="text-gray-600 text-xs sm:text-sm">موظفون</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{admins.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-r-4 border-orange-500">
          <p className="text-gray-600 text-xs sm:text-sm">عمال صيانة</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold">{workers.length}</p>
        </div>
      </div>

      {/* Super Admins */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            المشرفون الأعلى ({superAdmins.length})
          </h2>
        </div>
        <div className="divide-y">
          {superAdmins.map((user) => (
            <div key={user.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{user.name}</h3>
                    {!user.is_active && (
                      <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600">معطل</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <EditUserButton
                  userId={user.id}
                  userName={user.name}
                  userEmail={user.email}
                  userRole={user.role}
                />
                <UserLogsButton userId={user.id} />
                <ChangePasswordButton userId={user.id} userEmail={user.email} />
                <ToggleUserButton id={user.id} isActive={user.is_active} />
                <DeleteUserButton userId={user.id} userName={user.name} userEmail={user.email} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Admins */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-green-600" />
            الموظفون ({admins.length})
          </h2>
        </div>
        <div className="divide-y">
          {admins.length > 0 ? (
            admins.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      {!user.is_active && (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600">معطل</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EditUserButton
                    userId={user.id}
                    userName={user.name}
                    userEmail={user.email}
                    userRole={user.role}
                  />
                  <UserLogsButton userId={user.id} />
                  <EditPermissionsButton userId={user.id} userName={user.name} />
                  <ChangePasswordButton userId={user.id} userEmail={user.email} />
                  <ToggleUserButton id={user.id} isActive={user.is_active} />
                  <DeleteUserButton userId={user.id} userName={user.name} userEmail={user.email} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">لا يوجد موظفون</p>
          )}
        </div>
      </div>

      {/* Maintenance Workers */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            عمال الصيانة ({workers.length})
          </h2>
        </div>
        <div className="divide-y">
          {workers.length > 0 ? (
            workers.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-full flex items-center justify-center">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      {!user.is_active && (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-600">معطل</span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <EditUserButton
                    userId={user.id}
                    userName={user.name}
                    userEmail={user.email}
                    userRole={user.role}
                  />
                  <EditPermissionsButton userId={user.id} userName={user.name} />
                  <ChangePasswordButton userId={user.id} userEmail={user.email} />
                  <ToggleUserButton id={user.id} isActive={user.is_active} />
                  <DeleteUserButton userId={user.id} userName={user.name} userEmail={user.email} />
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">لا يوجد عمال صيانة</p>
          )}
        </div>
      </div>
    </div>
  );
}
