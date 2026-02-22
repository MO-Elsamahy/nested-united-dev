"use client";

import { useRouter } from "next/navigation";
import { Calendar, Wrench, Building2 } from "lucide-react";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    is_read: boolean;
    created_at: string;
    unit_id?: string | null;
    maintenance_ticket_id?: string | null;
    unit?: { unit_name: string };
  };
}

const typeLabels: Record<string, string> = {
  booking_created: "حجز جديد",
  booking_updated: "تحديث حجز",
  booking_cancelled: "إلغاء حجز",
  maintenance_created: "تذكرة صيانة",
  maintenance_status_changed: "تحديث صيانة",
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();

  const getIcon = (type: string) => {
    if (type.includes("booking")) return <Calendar className="w-5 h-5 text-blue-600" />;
    if (type.includes("maintenance")) return <Wrench className="w-5 h-5 text-orange-600" />;
    return <Building2 className="w-5 h-5 text-green-600" />;
  };

  const handleClick = async () => {
    // Mark as read
    if (!notification.is_read) {
      await fetch(`/api/notifications/${notification.id}/read`, {
        method: "POST",
      });
    }

    // Navigate to related page
    if (notification.maintenance_ticket_id) {
      router.push("/dashboard/maintenance");
    } else if (notification.unit_id) {
      router.push(`/dashboard/units/${notification.unit_id}`);
    }

    router.refresh();
  };

  return (
    <div
      onClick={handleClick}
      className={`block p-4 hover:bg-gray-50 cursor-pointer transition ${!notification.is_read ? "bg-blue-50" : ""
        }`}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-gray-100 rounded-lg">{getIcon(notification.type)}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{notification.title}</h3>
            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
              {typeLabels[notification.type] || notification.type}
            </span>
            {!notification.is_read && (
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-2">{notification.body}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>
              {new Date(notification.created_at).toLocaleString("ar-EG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {notification.unit && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {notification.unit.unit_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}






