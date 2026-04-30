
export type EmployeeStatus = "active" | "terminated" | "on_leave" | "onboarding";

export interface Employee {
    id: string;
    user_id?: string | null;
    employee_number?: string | null;
    full_name: string;
    national_id?: string | null;
    phone?: string | null;
    email?: string | null;
    department?: string | null;
    job_title?: string | null;
    hire_date?: string | null;
    contract_type?: "full_time" | "part_time" | "contractor";
    basic_salary: number;
    housing_allowance: number;
    transport_allowance: number;
    other_allowances: number;
    annual_leave_balance: number;
    sick_leave_balance: number;
    bank_name?: string | null;
    iban?: string | null;
    status: EmployeeStatus;
    shift_id?: string | null;
    exclude_from_payroll: boolean | number;
    salary_currency: string;
    created_at: string;
    updated_at: string;
    
    // Virtual
    user_name?: string;
    user_email?: string;
}



export type PayrollRunStatus = "draft" | "approved" | "paid" | "cancelled";

export interface PayrollRun {
    id: string;
    period_month: number;
    period_year: number;
    status: PayrollRunStatus;
    total_amount: number;
    total_employees: number;
    created_at: string;
    updated_at: string;
    approved_at?: string | null;
    approved_by?: string | null;
    accounting_move_id?: string | null;
    currency: string;
}

export interface PayrollDetail {
    id: string;
    payroll_run_id: string;
    employee_id: string;
    basic_salary: number;
    housing_allowance: number;
    transport_allowance: number;
    other_allowances: number;
    overtime_amount: number;
    absence_deduction: number;
    late_deduction: number;
    gosi_deduction: number;
    custom_addition: number;
    custom_addition_note?: string | null;
    custom_deduction: number;
    custom_deduction_note?: string | null;
    gross_salary: number;
    total_deductions: number;
    net_salary: number;
    salary_confirmed_at?: string | null;
    salary_confirmed_by?: string | null;
    
    // Virtual
    full_name?: string;
    department?: string;
    job_title?: string;
    bank_name?: string;
    iban?: string;
}

export interface PayrollLog {
    id: string;
    payroll_run_id: string;
    employee_id: string;
    action: string;
    details: string;
    created_at: string;
}

export interface Shift {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    late_grace_minutes: number;
    created_at: string;
}

export interface Attendance {
    id: string;
    employee_id: string;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: "present" | "absent" | "late" | "on_leave";
    late_minutes: number;
    overtime_minutes: number;
    notes?: string | null;
}

export interface HRRequest {
    id: string;
    employee_id: string;
    request_type: "leave" | "expense" | "letter" | "loan" | "other" | "annual_leave" | "sick_leave";
    start_date: string;
    end_date: string;
    days_count?: number;
    amount?: number | null;
    reason: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    comment?: string | null;
    created_at: string;
    updated_at: string;
    
    // Virtual
    full_name?: string;
    department?: string;
    job_title?: string;
}

export interface Evaluation {
    id: string;
    employee_id: string;
    template_id: string;
    eval_month: number;
    eval_year: number;
    total_score: number;
    max_possible_score: number;
    percentage: number;
    notes?: string | null;
    evaluated_by: string;
    created_at: string;
    employee_name?: string;
    department?: string;
    job_title?: string;
    template_name?: string;
    evaluator_name?: string;
}

export interface EvaluationCriterion {
    id: string;
    template_id: string;
    name: string;
    description?: string | null;
    max_score: number;
    weight: number;
}

export interface EvaluationScore {
    id: string;
    evaluation_id: string;
    criterion_id: string;
    score: number;
    comment?: string | null;
}

export interface EmployeeEvalConfig {
    id: string;
    employee_id: string;
    template_id: string;
    template_name?: string;
}

export interface EvaluationTemplate {
    id: string;
    name: string;
    description?: string | null;
    created_by: string;
    created_at: string;
}
