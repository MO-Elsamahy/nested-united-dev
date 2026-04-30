
export type InvoiceState = "draft" | "confirmed" | "partial" | "paid" | "cancelled" | "posted" | "overdue";
export type PaymentMethod = "cash" | "bank_transfer" | "credit_card" | "other";
export type InvoiceType = "customer_invoice" | "supplier_bill" | "credit_note";

export interface AccountingPartner {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    type: "customer" | "vendor" | "supplier" | "employee" | "both" | "other";
    tax_id?: string | null;
    address?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
}

export interface AccountingInvoice {
    id: string;
    invoice_number: string;
    invoice_type: InvoiceType;
    partner_id: string;
    journal_id: string;
    invoice_date: string;
    due_date?: string | null;
    reference?: string | null;
    notes?: string | null;
    state: InvoiceState;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    amount_paid: number;
    amount_due: number;
    currency: string;
    payment_terms?: string | null;
    attachment_url?: string | null;
    accounting_move_id?: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    
    // Virtual fields
    partner_name?: string;
    partner_email?: string;
    partner_phone?: string;
    partner_vat?: string;
    address?: string;
    lines?: AccountingInvoiceLine[];
    payments?: AccountingPaymentAllocation[];
}

export interface AccountingInvoiceLine {
    id: string;
    invoice_id: string;
    product_id?: string | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    tax_rate: number;
    tax_amount: number;
    account_id?: string | null;
    subtotal: number;
    line_total: number;
    line_total_with_tax: number;
}

export interface AccountingPayment {
    id: string;
    payment_number: string;
    payment_date: string;
    payment_type: "inbound" | "outbound";
    partner_id: string;
    journal_id: string;
    amount: number;
    currency: string;
    payment_method: PaymentMethod;
    reference?: string | null;
    notes?: string | null;
    state: "draft" | "posted" | "cancelled";
    created_by: string;
    created_at: string;
    updated_at: string;
    
    // Virtual fields
    partner_name?: string;
    invoices?: string;
}

export interface AccountingPaymentAllocation {
    id: string;
    payment_id: string;
    invoice_id: string;
    amount: number;
    created_at: string;
    
    // Virtual
    payment_number?: string;
    payment_date?: string;
    payment_method?: string;
}

export interface AccountingMove {
    id: string;
    journal_id: string;
    date: string;
    ref?: string | null;
    narration?: string | null;
    state: "draft" | "posted" | "cancelled";
    partner_id?: string | null;
    amount_total: number;
    attachment_url?: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    
    // Virtual fields
    journal_name?: string;
    journal_code?: string;
    partner_name?: string;
    created_by_name?: string;
    lines?: AccountingMoveLine[];
}

export interface AccountingMoveLine {
    id: string;
    move_id: string;
    account_id: string;
    partner_id?: string | null;
    cost_center_id?: string | null;
    name?: string | null;
    debit: number;
    credit: number;
    date_maturity?: string | null;
    tax_line_id?: string | null;
    
    // Virtual fields
    account_name?: string;
    account_code?: string;
    partner_name?: string;
}

export interface AccountingAccount {
    id: string;
    code: string;
    name: string;
    type: string;
    parent_id?: string | null;
    is_group: boolean;
    is_reconcilable: boolean;
    description?: string | null;
    deprecated: boolean;
    created_at: string;
}

export interface AccountingAuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string;
    created_at: string;
    user_name?: string;
}

export interface AccountingJournal {
    id: string;
    name: string;
    code: string;
    type: "sale" | "purchase" | "cash" | "bank" | "general";
    default_account_id?: string | null;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export interface CompanySettings {
    id: string;
    company_name: string;
    company_name_en?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    website?: string | null;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    postal_code?: string | null;
    tax_number?: string | null;
    commercial_registration?: string | null;
    default_payment_terms?: string | null;
    invoice_footer?: string | null;
    invoice_notes?: string | null;
    invoice_terms?: string | null;
    invoice_type_label?: string | null;
    bank_name?: string | null;
    bank_account?: string | null;
    iban?: string | null;
    swift_code?: string | null;
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_username?: string | null;
    smtp_password?: string | null;
    smtp_from_email?: string | null;
    smtp_from_name?: string | null;
    invoice_number_prefix?: string | null;
    payment_number_prefix?: string | null;
    next_invoice_number?: number;
    updated_at?: string;
}


export interface CostCenter {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    created_at?: string;
    updated_at?: string;
}
