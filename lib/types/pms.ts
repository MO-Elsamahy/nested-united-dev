
export interface Unit {
    id: string;
    unit_name: string;
    unit_code?: string | null;
    city?: string | null;
    address?: string | null;
    capacity?: number | null;
    status: "active" | "inactive" | "maintenance";
    readiness_status?: string | null;
    readiness_updated_at?: string | null;
    readiness_notes?: string | null;
    readiness_guest_name?: string | null;
    readiness_checkin_date?: string | null;
    readiness_checkout_date?: string | null;
    readiness_group_id?: string | null;
    unit_calendars?: UnitCalendar[];
}

export interface UnitCalendar {
    id: string;
    unit_id?: string;
    platform: string;
    ical_url?: string | null;
    is_primary: boolean | number;
    platform_account_id?: string | null;
    platform_account?: {
        id: string;
        account_name: string;
        platform: string;
    } | null;
}

export interface Booking {
    id: string;
    unit_id: string;
    guest_name: string;
    checkin_date: string;
    checkout_date: string;
    status: string;
}

export interface UnitWithReadiness extends Unit {
    unit_calendars?: UnitCalendar[];
    _has_checkin_today?: boolean;
    _has_checkout_today?: boolean;
    _computed_status?: string;
    _merged_units?: UnitWithReadiness[];
    
    // Join fields
    manual_checkin_guest?: string | null;
    ical_checkin_guest?: string | null;
    manual_checkout_guest?: string | null;
    ical_checkout_guest?: string | null;
    manual_checkin_date?: string | null;
    ical_checkin_date?: string | null;
    manual_checkout_date?: string | null;
    ical_checkout_date?: string | null;
}
