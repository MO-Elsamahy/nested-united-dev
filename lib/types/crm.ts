/** Shared CRM shapes for API responses and client pages */

export interface CRMCustomer {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    national_id: string | null;
    address: string | null;
    type: string;
    notes: string | null;
    status: string;
    created_at?: string;
}

export interface CrmActivity {
    id: string;
    type: string;
    title: string;
    description: string | null;
    performed_at: string;
    performed_by_name?: string | null;
}

export interface CrmDeal {
    id: string;
    customer_id?: string;
    title: string;
    stage: string;
    status?: string;
    value: number | string | null;
    priority?: string | null;
    expected_close_date?: string | null;
    customer_name?: string | null;
}

export interface CustomerDetailResponse {
    customer: CRMCustomer;
    activities: CrmActivity[];
    deals: CrmDeal[];
    /** Total deals (any status), for badges; list `deals` is open-only */
    total_deal_count?: number;
}

export function activityTitleForType(type: string): string {
    if (type === "note") return "ملاحظة";
    if (type === "call") return "اتصال هاتفي";
    if (type === "meeting") return "اجتماع";
    return "نشاط";
}

export interface CRMTag {
    id: string;
    name: string;
    color: string;
    text_color: string;
}
