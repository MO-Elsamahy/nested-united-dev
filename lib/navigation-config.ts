import {
    LayoutDashboard,
    Home,
    Building2,
    ClipboardCheck,
    Calendar,
    Wrench,
    Globe,
    Users,
    FileText,
    ScrollText,
    Calculator,
    BookOpen,
    Target,
    History,
    FileBarChart,
    Clock,
    DollarSign,
    Megaphone,
    Settings,
    Trophy,
    PieChart,
    Shield,
    MessageSquare,
    Pencil,
    TrendingUp,
    Activity,
    LucideIcon
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    requiresSuperAdmin?: boolean;
    /** If set, only these roles see the item (e.g. CRM reports & settings). */
    allowedRoles?: string[];
}

export interface NavSection {
    title?: string; // Optional section header
    items: NavItem[];
}

export const DASHBOARD_NAV: NavSection[] = [
    {
        title: "العمليات الأساسية",
        items: [
            { label: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
            { label: "صندوق الوارد", href: "/dashboard/inbox", icon: MessageSquare }, // New Unified Inbox
            { label: "حسابات المستثمرين", href: "/dashboard/accounts", icon: Home }, 
            { label: "الوحدات", href: "/dashboard/units", icon: Building2 },
            { label: "الحجوزات", href: "/dashboard/bookings", icon: Calendar },
        ]
    },
    {
        title: "الإدارة والصيانة",
        items: [
            { label: "جاهزية الوحدات", href: "/dashboard/unit-readiness", icon: ClipboardCheck },
            { label: "الصيانة", href: "/dashboard/maintenance", icon: Wrench },
            { label: "حسابات المتصفح", href: "/dashboard/browser-accounts", icon: Globe },
        ]
    },
    {
        title: "الإدارة",
        items: [
            { label: "المستخدمون", href: "/dashboard/users", icon: Users, requiresSuperAdmin: true },
            { label: "سجل الأنشطة", href: "/dashboard/activity-logs", icon: FileText, requiresSuperAdmin: true },
        ]
    }
];

export const ANALYTICS_NAV: NavSection[] = [
    {
        title: "أقسام التحليلات",
        items: [
            { label: "لوحة القيادة التنفيذية", href: "/analytics?tab=executive", icon: TrendingUp },
            { label: "العمليات المباشرة", href: "/analytics?tab=live_ops", icon: Activity },
            { label: "ربحية الوحدات", href: "/analytics?tab=profitability", icon: DollarSign },
            { label: "مبيعات وتوقعات CRM", href: "/analytics?tab=crm", icon: Target },
            { label: "الموارد البشرية والرواتب", href: "/analytics?tab=hr", icon: Users },
        ]
    }
];

export const ACCOUNTING_NAV: NavSection[] = [
    {
        items: [
            { label: "لوحة المؤشرات", href: "/accounting", icon: LayoutDashboard }
        ]
    },
    {
        title: "العمليات اليومية",
        items: [
            { label: "الفواتير", href: "/accounting/invoices", icon: FileText, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "سندات القبض والصرف", href: "/accounting/payments", icon: DollarSign, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "دفاتر اليومية", href: "/accounting/journals", icon: ScrollText, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "قيد جديد", href: "/accounting/moves/create", icon: Calculator, allowedRoles: ["super_admin", "admin", "accountant"] }
        ]
    },
    {
        title: "الإعدادات والبيانات",
        items: [
            { label: "دليل الحسابات", href: "/accounting/accounts", icon: BookOpen, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "الشركاء والموردين", href: "/accounting/partners", icon: Users },
            { label: "مراكز التكلفة", href: "/accounting/cost-centers", icon: Target, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "سجل الأحداث", href: "/accounting/backlog", icon: History, allowedRoles: ["super_admin", "admin", "accountant"] }
        ]
    },
    {
        title: "التقارير",
        items: [
            { label: "مركز التقارير", href: "/accounting/reports", icon: FileBarChart },
            { label: "قائمة الدخل", href: "/accounting/reports/income-statement", icon: TrendingUp, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "المركز المالي", href: "/accounting/reports/balance-sheet", icon: PieChart, allowedRoles: ["super_admin", "admin", "accountant"] },
            { label: "الإيرادات والتكاليف", href: "/accounting/reports/revenue-expenses", icon: Activity, allowedRoles: ["super_admin", "admin", "accountant"] },
        ]
    }
];

export const HR_NAV: NavSection[] = [
    {
        title: "إدارة الموظفين",
        items: [
            { label: "لوحة التحكم", href: "/hr", icon: LayoutDashboard },
            { label: "الموظفين", href: "/hr/employees", icon: Users },
            { label: "الحضور والانصراف", href: "/hr/attendance", icon: Clock },
            { label: "تقارير الحضور", href: "/hr/attendance/reports", icon: FileBarChart },
            { label: "تعديل يدوي للحضور", href: "/hr/attendance/manual", icon: Pencil, allowedRoles: ["super_admin", "admin", "hr_manager", "accountant"] },
            { label: "الطلبات والاجازات", href: "/hr/requests", icon: FileText }
        ]
    },
    {
        title: "الأداء والتقييم",
        items: [
            { label: "تقييمات الموظفين", href: "/hr/evaluations", icon: ClipboardCheck },
            { label: "قوالب التقييم", href: "/hr/evaluations/templates", icon: Target }
        ]
    },
    {
        title: "العمليات المالية",
        items: [
            { label: "الرواتب", href: "/hr/payroll", icon: DollarSign, allowedRoles: ["super_admin", "hr_manager"] }
        ]
    },
    {
        title: "الاتصالات",
        items: [
            { label: "الإعلانات", href: "/hr/announcements", icon: Megaphone },
            { label: "المراسلات", href: "/hr/messages", icon: MessageSquare }
        ]
    },
    {
        title: "الإعدادات",
        items: [
            { label: "إعدادات الموارد البشرية", href: "/hr/settings", icon: Settings } // Renamed
        ]
    }
];

export const CRM_NAV: NavSection[] = [
    {
        title: "المبيعات والعملاء",
        items: [
            { label: "لوحة التحكم", href: "/crm", icon: LayoutDashboard },
            { label: "العملاء", href: "/crm/customers", icon: Users },
            { label: "الصفقات (Pipeline)", href: "/crm/deals", icon: Trophy }
        ]
    },
    {
        title: "التقارير",
        items: [
            {
                label: "التقارير",
                href: "/crm/reports",
                icon: PieChart,
                allowedRoles: ["super_admin", "hr_manager"],
            },
        ],
    },
    {
        title: "الإعدادات",
        items: [
            {
                label: "إعدادات العملاء",
                href: "/crm/settings",
                icon: Settings,
                allowedRoles: ["super_admin", "hr_manager"],
            },
        ],
    },
];

export const SETTINGS_NAV: NavSection[] = [
    {
        title: "النظام",
        items: [
            { label: "عام", href: "/settings", icon: Settings },
            { label: "معلومات الشركة", href: "/settings/company", icon: Building2 }
        ]
    },
    {
        title: "الأمان والوصول",
        items: [
            { label: "المستخدمين", href: "/settings/users", icon: Users },
            { label: "صلاحيات الأدوار", href: "/settings/roles", icon: Shield },
            { label: "صلاحيات الصفحات", href: "/settings/page-permissions", icon: Users }
        ]
    }
];

// Map for Breadcrumbs/Headings
export const PATH_NAME_MAP: Record<string, string> = {
    dashboard: "إدارة التأجير",
    analytics: "التحليلات المتقدمة",
    accounting: "النظام المالي",
    hr: "الموارد البشرية",
    crm: "إدارة العملاء",
    settings: "الإعدادات",
    users: "المستخدمين",
    employees: "الموظفين",
    units: "الوحدات",
    notifications: "الإشعارات",
    reports: "التقارير",
    // Add new ones
    "unit-readiness": "جاهزية الوحدات",
    maintenance: "الصيانة",
    "browser-accounts": "حسابات المتصفح",
    "activity-logs": "سجل الأنشطة",
    journals: "دفاتر اليومية",
    accounts: "حسابات المستثمرين", 
    partners: "الشركاء والموردين",
    "cost-centers": "مراكز التكلفة",
    backlog: "سجل الأحداث",
    attendance: "الحضور والانصراف",
    requests: "الطلبات",
    payroll: "الرواتب",
    announcements: "الإعلانات",
    messages: "المراسلات الإدارية",
    evaluations: "التقييمات الشهرية",
    templates: "قوالب التقييم",
    profile: "الملف الشخصي",
    payslips: "مسيرات الرواتب",
    payments: "سندات القبض والصرف",
    customers: "العملاء",
    deals: "الصفقات",
    roles: "صلاحيات الأدوار",
    "page-permissions": "صلاحيات الصفحات",
    "partner-ledger": "كشف حساب الشركاء",
    "trial-balance": "ميزان المراجعة",
    "general-ledger": "دفتر الأستاذ العام",
    "balance-sheet": "الميزانية العمومية",
    "income-statement": "قائمة الدخل",
    "revenue-expenses": "تقرير الإيرادات والتكاليف"
};

export const SYSTEM_PAGES: Record<string, { path: string; label: string }[]> = {
    rentals: [
        { path: "/dashboard", label: "لوحة التحكم الرئيسية" },
        { path: "/dashboard/inbox", label: "صندوق الوارد" },
        { path: "/dashboard/units", label: "الوحدات" },
        { path: "/dashboard/bookings", label: "الحجوزات" },
        { path: "/dashboard/bookings/amounts", label: "عرض المبالغ المالية للحجوزات" },
        { path: "/dashboard/accounts", label: "حسابات المستثمرين" },
        { path: "/dashboard/maintenance", label: "الصيانة" },
        { path: "/dashboard/browser-accounts", label: "حسابات المتصفح" },
        { path: "/dashboard/notifications", label: "الإشعارات" },
        { path: "/dashboard/unit-readiness", label: "جاهزية الوحدات" },
        { path: "/dashboard/activity-logs", label: "سجل النشاط" },
    ],
    analytics: [
        { path: "/analytics", label: "لوحة القيادة التنفيذية" },
        { path: "/analytics?tab=live_ops", label: "العمليات المباشرة" },
        { path: "/analytics?tab=profitability", label: "ربحية الوحدات" },
        { path: "/analytics?tab=crm", label: "مبيعات وتوقعات CRM" },
        { path: "/analytics?tab=hr", label: "الموارد البشرية والرواتب" },
    ],
    accounting: [
        { path: "/accounting", label: "لوحة المؤشرات" },
        { path: "/accounting/invoices", label: "الفواتير" },
        { path: "/accounting/payments", label: "سندات القبض والصرف" },
        { path: "/accounting/journals", label: "دفاتر اليومية" },
        { path: "/accounting/moves/create", label: "قيد جديد" },
        { path: "/accounting/accounts", label: "دليل الحسابات" },
        { path: "/accounting/partners", label: "الشركاء والموردين" },
        { path: "/accounting/cost-centers", label: "مراكز التكلفة" },
        { path: "/accounting/backlog", label: "سجل الأحداث" },
        { path: "/accounting/reports", label: "مركز التقارير" },
        { path: "/accounting/reports/partner-ledger", label: "كشف حساب الشركاء" },
        { path: "/accounting/reports/trial-balance", label: "ميزان المراجعة" },
        { path: "/accounting/reports/general-ledger", label: "دفتر الأستاذ العام" },
        { path: "/accounting/reports/balance-sheet", label: "الميزانية العمومية" },
        { path: "/accounting/reports/income-statement", label: "قائمة الدخل" },
        { path: "/accounting/reports/revenue-expenses", label: "تقرير الإيرادات والتكاليف" },
    ],
    hr: [
        { path: "/hr", label: "لوحة التحكم" },
        { path: "/hr/employees", label: "الموظفين" },
        { path: "/hr/attendance", label: "الحضور والانصراف" },
        { path: "/hr/attendance/reports", label: "تقارير الحضور" },
        { path: "/hr/attendance/manual", label: "تعديل يدوي للحضور" },
        { path: "/hr/requests", label: "الطلبات والاجازات" },
        { path: "/hr/evaluations", label: "تقييمات الموظفين" },
        { path: "/hr/evaluations/templates", label: "قوالب التقييم" },
        { path: "/hr/payroll", label: "الرواتب" },
        { path: "/hr/announcements", label: "الإعلانات" },
        { path: "/hr/messages", label: "المراسلات" },
        { path: "/hr/settings", label: "إعدادات الموارد البشرية" },
    ],
    crm: [
        { path: "/crm", label: "لوحة التحكم" },
        { path: "/crm/customers", label: "العملاء" },
        { path: "/crm/deals", label: "الصفقات (Pipeline)" },
        { path: "/crm/reports", label: "التقارير" },
        { path: "/crm/settings", label: "إعدادات العملاء" },
    ],
    maintenance: [
        { path: "/dashboard/maintenance", label: "إدارة الصيانة" },
    ]
};

