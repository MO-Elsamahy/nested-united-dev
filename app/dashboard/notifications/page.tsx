

import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Bell } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import { MarkAllReadButton } from "./MarkAllReadButton";
import { redirect } from "next/navigation";

import { NotificationWithRelations } from "@/lib/types/database";
// remove local interface

async function getNotifications(userId: string, role: string): Promise<NotificationWithRelations[]> {
  // Get user-specific notifications
  const userNotifications = await query<Record<string, unknown>>(
    `SELECT n.*, u.unit_name
     FROM notifications n
     LEFT JOIN units u ON n.unit_id = u.id
     WHERE n.recipient_user_id = ?
     ORDER BY n.created_at DESC
     LIMIT 50`,
    [userId]
  );

  // Build audience conditions
  const audiences = ["'all_users'"];
  if (role === "admin" || role === "super_admin") {
    audiences.push("'all_admins'");
  }
  if (role === "super_admin") {
    audiences.push("'all_super_admins'");
  }
  if (role === "maintenance_worker") {
    audiences.push("'maintenance_workers'");
  }

  // Get general notifications based on audience
  const generalNotifications = await query<Record<string, unknown>>(
    `SELECT n.*, u.unit_name
     FROM notifications n
     LEFT JOIN units u ON n.unit_id = u.id
     WHERE n.audience IN (${audiences.join(",")})
       AND n.recipient_user_id IS NULL
     ORDER BY n.created_at DESC
     LIMIT 50`
  );

  // Combine and deduplicate
  const allNotifications = [...userNotifications, ...generalNotifications];
  const uniqueMap = new Map<string, NotificationWithRelations>();
  for (const n of allNotifications) {
    const id = n.id as string;
    if (!uniqueMap.has(id)) {
      uniqueMap.set(id, {
        ...(n as unknown as NotificationWithRelations),
        is_read: n.is_read === 1 || n.is_read === true,
        unit: n.unit_id ? { 
            id: n.unit_id as string, 
            unit_name: n.unit_name as string,
            platform_account_id: "", // dummy
            unit_code: null,
            city: null,
            address: null,
            capacity: null,
            status: "active",
            created_at: "",
            last_synced_at: null
        } : undefined,
      });
    }
  }

  return Array.from(uniqueMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default async function NotificationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const notifications = await getNotifications(currentUser.id, currentUser.role);
  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">الإشعارات</h1>
          <p className="text-gray-600 mt-1">جميع الإشعارات والتحديثات</p>
        </div>
        {unread.length > 0 && <MarkAllReadButton />}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-r-4 border-blue-500">
          <p className="text-gray-600 text-sm">غير مقروءة</p>
          <p className="text-3xl font-bold">{unread.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-r-4 border-gray-300">
          <p className="text-gray-600 text-sm">مقروءة</p>
          <p className="text-3xl font-bold">{read.length}</p>
        </div>
      </div>

      {/* Unread Notifications */}
      {unread.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-lg">غير مقروءة ({unread.length})</h2>
          </div>
          <div className="divide-y">
            {unread.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))}
          </div>
        </div>
      )}

      {/* Read Notifications */}
      {read.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-lg text-gray-500">مقروءة ({read.length})</h2>
          </div>
          <div className="divide-y opacity-75">
            {read.map((notif) => (
              <NotificationItem key={notif.id} notification={notif} />
            ))}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">لا توجد إشعارات</p>
        </div>
      )}
    </div>
  );
}
