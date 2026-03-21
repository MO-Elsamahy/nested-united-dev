// Database types for the rentals dashboard

export type UserRole = "super_admin" | "admin" | "accountant" | "hr_manager" | "maintenance_worker" | "employee";
export type Platform = "airbnb" | "gathern" | "whatsapp" | "zomrahub";
export type PlatformExtended = "airbnb" | "gathern" | "whatsapp" | "zomrahub" | "general" | "manual" | "unknown";
export type UnitStatus = "active" | "inactive";

export type UnitReadinessStatus =
  | "checkout_today"           // خروج اليوم
  | "checkin_today"            // دخول اليوم
  | "guest_not_checked_out"    // الضيف لم يخرج
  | "awaiting_cleaning"        // في انتظار التنظيف
  | "cleaning_in_progress"     // قيد التنظيف
  | "ready"                    // جاهزة للتسكين
  | "occupied";                // تم التسكين
export type MaintenanceStatus = "open" | "in_progress" | "resolved";
export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type NotificationType =
  | "booking_created"
  | "booking_updated"
  | "booking_cancelled"
  | "maintenance_created"
  | "maintenance_status_changed"
  | "unit_activated"
  | "unit_deactivated";
export type NotificationAudience = "all_admins" | "all_super_admins" | "all_users" | "maintenance_workers";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PlatformAccount {
  id: string;
  platform: PlatformExtended;
  account_name: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface Unit {
  id: string;
  platform_account_id: string;
  unit_name: string;
  unit_code: string | null;
  city: string | null;
  address: string | null;
  capacity: number | null;
  status: UnitStatus;
  // Readiness fields (inline on units)
  readiness_status?: UnitReadinessStatus | null;
  readiness_checkout_date?: string | null;
  readiness_checkin_date?: string | null;
  readiness_guest_name?: string | null;
  readiness_notes?: string | null;
  readiness_updated_by?: string | null;
  readiness_updated_at?: string | null;
  created_at: string;
  last_synced_at: string | null;
}

export interface UnitPlatform {
  id: string;
  unit_id: string;
  platform: "airbnb" | "gathern" | "zomrahub";
  listing_code?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface UnitCalendar {
  id: string;
  unit_id: string;
  platform: Platform;
  ical_url: string;
  is_primary: boolean;
  created_at: string;
}

export interface Reservation {
  id: string;
  unit_id: string;
  platform: Platform;
  start_date: string;
  end_date: string;
  summary: string | null;
  raw_event: Record<string, any> | null;
  last_synced_at: string;
  created_at: string;
}

export interface MaintenanceTicket {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority | null;
  created_by: string;
  created_at: string;
  resolved_at: string | null;
  // New fields for maintenance worker
  assigned_to: string | null;
  accepted_at: string | null;
  worker_notes: string | null;
}

export interface Booking {
  id: string;
  unit_id: string;
  platform_account_id?: string | null;
  platform?: PlatformExtended | null;
  guest_name: string;
  phone?: string | null;
  checkin_date: string;
  checkout_date: string;
  amount: number;
  currency: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  unit_id: string | null;
  platform: Platform | null;
  maintenance_ticket_id: string | null;
  title: string;
  body: string;
  data: Record<string, any> | null;
  audience: NotificationAudience;
  recipient_user_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface SyncLog {
  id: string;
  run_at: string;
  status: "success" | "partial" | "failed";
  message: string | null;
  units_processed: number;
  errors_count: number;
  details: Record<string, any> | null;
}

// Extended types with relations
export interface UnitWithAccount extends Unit {
  platform_account?: PlatformAccount;
}

export interface MaintenanceTicketWithUnit extends MaintenanceTicket {
  unit?: Unit;
  created_by_user?: User;
}

export interface NotificationWithRelations extends Notification {
  unit?: Unit;
  maintenance_ticket?: MaintenanceTicket;
}

export interface ReservationWithUnit extends Reservation {
  unit?: Unit;
}

// Browser accounts for Electron WebViews
export interface BrowserAccount {
  id: string;
  platform: Platform;
  account_name: string;
  account_email: string | null;
  notes: string | null;
  platform_account_id: string | null;
  session_partition: string;
  last_notification_at: string | null;
  has_unread_notifications: boolean;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BrowserNotification {
  id: string;
  browser_account_id: string;
  detected_at: string;
  notification_type: string | null;
  is_acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export interface BrowserAccountWithNotifications extends BrowserAccount {
  notifications?: BrowserNotification[];
}

export interface MaintenanceTicketWithWorker extends MaintenanceTicket {
  unit?: Unit;
  created_by_user?: User;
  assigned_worker?: User;
}

export interface UnitWithReadiness extends Unit {
  platform_account?: PlatformAccount;
}



