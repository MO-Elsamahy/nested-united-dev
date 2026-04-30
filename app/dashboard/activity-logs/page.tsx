"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Filter, Download, User, Calendar, Eye } from "lucide-react";

import { usePermission } from "@/lib/hooks/usePermission";

interface ActivityLog {
  id: string;
  user_id: string;
  action_type: string;
  page_path: string | null;
  resource_type: string | null;
  resource_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export default function ActivityLogsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ActivityLogsContent />
        </Suspense>
    );
}

function ActivityLogsContent() {
  const router = useRouter();
  const hasViewPermission = usePermission("view");
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user_id");
  
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.map((u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email })));
        setIsSuperAdmin(true);
      } else if (response.status === 403) {
        setIsSuperAdmin(false);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setIsSuperAdmin(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });
      if (selectedUserId) {
        params.append("user_id", selectedUserId);
      }
      if (fromDate) {
        params.append("from_date", fromDate);
      }
      if (toDate) {
        params.append("to_date", toDate);
      }

      const response = await fetch(`/api/activity-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, selectedUserId, fromDate, toDate]);

  useEffect(() => {
    if (hasViewPermission === false) {
      router.push("/dashboard");
      return;
    }
    if (hasViewPermission === true) {
      loadUsers();
      loadLogs();
    }
  }, [hasViewPermission, router, loadUsers, loadLogs]);

  useEffect(() => {
    if (hasViewPermission === true) {
      loadLogs();
    }
  }, [page, selectedUserId, fromDate, toDate, hasViewPermission, loadLogs]);

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      page_view: "عرض صفحة",
      create: "إنشاء",
      update: "تحديث",
      delete: "حذف",
      export: "تصدير",
      login: "تسجيل دخول",
      logout: "تسجيل خروج",
    };
    return labels[actionType] || actionType;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const exportLogs = () => {
    const csv = [
      ["المستخدم", "نوع الإجراء", "الصفحة", "الوصف", "التاريخ", "IP"],
      ...logs.map((log) => [
        log.user?.name || "غير معروف",
        getActionLabel(log.action_type),
        log.page_path || "-",
        log.description || "-",
        formatDate(log.created_at),
        log.ip_address || "-",
      ]),
    ].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (hasViewPermission === null || hasViewPermission === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">سجل الأنشطة</h1>
          <p className="text-gray-600 mt-1">تتبع جميع أنشطة المستخدمين</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Download className="w-5 h-5" />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      {isSuperAdmin && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">المستخدم</span>
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value || null);
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm min-w-[200px]"
                >
                  <option value="">جميع المستخدمين</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">من تاريخ</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-wider">إلى تاريخ</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                />
              </div>
            </div>

            {(selectedUserId || fromDate || toDate) && (
              <button
                onClick={() => {
                  setSelectedUserId(null);
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
                className="mt-5 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                مسح التصفية
              </button>
            )}
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">جارٍ التحميل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">لا توجد سجلات نشاط</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      المستخدم
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      نوع الإجراء
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      الصفحة
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      الوصف
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      التاريخ والوقت
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{log.user?.name || "غير معروف"}</p>
                            <p className="text-sm text-gray-500">{log.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {getActionLabel(log.action_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{log.page_path || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm">{log.description || "-"}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500">{log.ip_address || "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  السابق
                </button>
                <span className="text-sm text-gray-600">
                  صفحة {page} من {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

