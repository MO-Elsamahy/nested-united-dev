import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { checkUserPermission } from "@/lib/permissions";
import { hasPermission } from "@/lib/server-permissions";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { AccountsPageClient } from "./AccountsPageClient";

interface PlatformAccount {
  id: string;
  platform: string;
  account_name: string;
  notes: string | null;
  created_at: string;
}

async function getAccounts(): Promise<PlatformAccount[]> {
  const accounts = await query<PlatformAccount>(
    "SELECT * FROM platform_accounts ORDER BY platform, created_at DESC"
  );
  return accounts;
}

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check permission to view
  const canView = await checkUserPermission(session.user.id, "/dashboard/accounts", "view");
  if (!canView) {
    redirect("/dashboard?error=no_permission");
  }

  const accounts = await getAccounts();
  const canEdit = await hasPermission("/dashboard/accounts", "edit");
  const airbnbAccounts = accounts.filter((a) => a.platform === "airbnb");
  const gathernAccounts = accounts.filter((a) => a.platform === "gathern");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">الحسابات</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">إدارة حسابات المنصات</p>
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/accounts/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg transition text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>إضافة حساب</span>
          </Link>
        ) : (
          <AccountsPageClient />
        )}
      </div>

      {/* Airbnb */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm">Airbnb</span>
            <span className="text-gray-400">({airbnbAccounts.length})</span>
          </h2>
        </div>
        <div className="p-6">
          {airbnbAccounts.length > 0 ? (
            <div className="space-y-3">
              {airbnbAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{account.account_name}</h3>
                    {account.notes && <p className="text-gray-600 text-sm mt-1">{account.notes}</p>}
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(account.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/accounts/${account.id}/edit`}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200"
                      >
                        تعديل
                      </Link>
                      <DeleteAccountButton id={account.id} name={account.account_name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">لا توجد حسابات Airbnb</p>
          )}
        </div>
      </div>

      {/* Gathern */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span className="bg-green-100 text-green-600 px-3 py-1 rounded text-sm">Gathern</span>
            <span className="text-gray-400">({gathernAccounts.length})</span>
          </h2>
        </div>
        <div className="p-6">
          {gathernAccounts.length > 0 ? (
            <div className="space-y-3">
              {gathernAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{account.account_name}</h3>
                    {account.notes && <p className="text-gray-600 text-sm mt-1">{account.notes}</p>}
                    <p className="text-gray-400 text-xs mt-2">
                      {new Date(account.created_at).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/accounts/${account.id}/edit`}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200"
                      >
                        تعديل
                      </Link>
                      <DeleteAccountButton id={account.id} name={account.account_name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">لا توجد حسابات Gathern</p>
          )}
        </div>
      </div>
    </div>
  );
}
