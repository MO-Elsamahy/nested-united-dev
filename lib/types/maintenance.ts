
export interface MaintenanceTicket {
    id: string;
    unit_id: string;
    title: string;
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent" | null;
    status: "open" | "assigned" | "in_progress" | "resolved" | "cancelled";
    created_by: string;
    assigned_to?: string | null;
    created_at: string;
    updated_at: string;
    unit_name?: string;
    created_by_name?: string;
    unit?: {
        unit_name: string;
    };
    created_by_user?: {
        name: string;
    };
}
