import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkUserPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Plus, AlertCircle, Clock, CheckCircle2, UserCheck } from "lucide-react";
import Link from "next/link";
import { UpdateStatusButton } from "./UpdateStatusButton";
import { AcceptTicketButton } from "./AcceptTicketButton";
import { AssignWorkerButton } from "./AssignWorkerButton";

interface MaintenanceTicket {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
  created_by: string;
  assigned_to: string | null;
  accepted_at: string | null;
  worker_notes: string | null;
  created_at: string;
  unit_name: string | null;
  created_by_name: string | null;
  assigned_worker_name: string | null;
  assigned_worker_id: string | null;
}

async function getTickets(): Promise<MaintenanceTicket[]> {
  const tickets = await query<any>(
    `SELECT mt.*, 
            u.unit_name,
            creator.name as created_by_name,
            worker.id as assigned_worker_id,
            worker.name as assigned_worker_name
     FROM maintenance_tickets mt
     LEFT JOIN units u ON mt.unit_id = u.id
     LEFT JOIN users creator ON mt.created_by = creator.id
     LEFT JOIN users worker ON mt.assigned_to = worker.id
     ORDER BY mt.created_at DESC`
  );

  return tickets.map((t) => ({
    ...t,
    unit: { unit_name: t.unit_name },
    created_by_user: { id: t.created_by, name: t.created_by_name },
    assigned_worker: t.assigned_worker_id ? { id: t.assigned_worker_id, name: t.assigned_worker_name } : null,
  }));
}

async function getMaintenanceWorkers() {
  const workers = await query<{ id: string; name: string }>(
    "SELECT id, name FROM users WHERE role = 'maintenance_worker' AND is_active = 1"
  );
  return workers;
}

export default async function MaintenancePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Check permission
  const hasPermission = await checkUserPermission(currentUser.id, "/dashboard/maintenance", "view");
  if (!hasPermission) {
    redirect("/dashboard?error=no_permission");
  }

  const [tickets, workers] = await Promise.all([
    getTickets(),
    getMaintenanceWorkers(),
  ]);

  const isWorker = currentUser.role === "maintenance_worker";
  const isAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";

  // For workers, filter tickets
  const filteredTickets = isWorker
    ? tickets.filter((t) => {
      if (t.assigned_to === currentUser.id) return true;
      if (t.status === "open" && !t.assigned_to && !t.accepted_at) return true;
      return false;
    })
    : tickets;

  const open = filteredTickets.filter((t) => t.status === "open");
  const inProgress = filteredTickets.filter((t) => t.status === "in_progress");
  const resolved = filteredTickets.filter((t) => t.status === "resolved");

  const priorityLabels: Record<string, string> = {
    low: "منخفضة",
    medium: "متوسطة",
    high: "عالية",
    urgent: "عاجلة",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-600",
    medium: "bg-blue-100 text-blue-600",
    high: "bg-orange-100 text-orange-600",
    urgent: "bg-red-100 text-red-600",
  };

  const statusLabels: Record<string, string> = {
    open: "مفتوحة",
    in_progress: "قيد التنفيذ",
    resolved: "محلولة",
  };

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isWorker ? "تذاكر الصيانة الخاصة بي" : "تذاكر الصيانة"}
          </h1>
          <p className="text-gray-600 mt-1">
            {isWorker ? "التذاكر المعينة لك" : "متابعة وإدارة الصيانة"}
          </p>
        </div>
        {(isAdmin || isWorker) && (
          <Link
            href="/dashboard/maintenance/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" />
            <span>تذكرة جديدة</span>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-r-4 border-red-500 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div>
            <p className="text-gray-600 text-sm">مفتوحة</p>
            <p className="text-3xl font-bold">{open.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-r-4 border-yellow-500 flex items-center gap-3">
          <Clock className="w-8 h-8 text-yellow-500" />
          <div>
            <p className="text-gray-600 text-sm">قيد التنفيذ</p>
            <p className="text-3xl font-bold">{inProgress.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-r-4 border-green-500 flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <div>
            <p className="text-gray-600 text-sm">محلولة</p>
            <p className="text-3xl font-bold">{resolved.length}</p>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length > 0 ? (
        <div className="bg-white rounded-lg shadow divide-y">
          {filteredTickets.map((ticket: any) => (
            <div key={ticket.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold">{ticket.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[ticket.status]}`}>
                      {statusLabels[ticket.status]}
                    </span>
                    {ticket.priority && (
                      <span className={`px-2 py-1 rounded text-xs ${priorityColors[ticket.priority]}`}>
                        {priorityLabels[ticket.priority]}
                      </span>
                    )}
                    {ticket.accepted_at && (
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" />
                        مقبولة
                      </span>
                    )}
                  </div>
                  {ticket.description && (
                    <p className="text-gray-600 text-sm mb-2 line-clamp-2">{ticket.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                    <span>الوحدة: {ticket.unit?.unit_name || ticket.unit_name}</span>
                    <span>{new Date(ticket.created_at).toLocaleDateString("ar-EG")}</span>
                    <span>بواسطة: {ticket.created_by_user?.name || ticket.created_by_name || "غير محدد"}</span>
                    {ticket.assigned_worker && (
                      <span className="text-blue-600">
                        معين لـ: {ticket.assigned_worker.name}
                      </span>
                    )}
                  </div>
                  {ticket.worker_notes && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                      <strong>ملاحظات العامل:</strong> {ticket.worker_notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-end">
                  {isAdmin && !ticket.assigned_to && workers.length > 0 && (
                    <AssignWorkerButton ticketId={ticket.id} workers={workers} />
                  )}
                  {isWorker &&
                    ticket.status === "open" &&
                    !ticket.accepted_at &&
                    (ticket.assigned_to === null || ticket.assigned_to === currentUser.id) && (
                      <AcceptTicketButton ticketId={ticket.id} />
                    )}
                  {(isAdmin || (isWorker && ticket.assigned_to === currentUser.id && ticket.accepted_at)) && (
                    <UpdateStatusButton id={ticket.id} currentStatus={ticket.status} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">
            {isWorker ? "لا توجد تذاكر معينة لك" : "لا توجد تذاكر صيانة"}
          </p>
        </div>
      )}
    </div>
  );
}
