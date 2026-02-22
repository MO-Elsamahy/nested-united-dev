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
    Info,
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
    Shield
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: any;
    requiresSuperAdmin?: boolean;
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
            { label: "حسابات المنصات", href: "/dashboard/accounts", icon: Home }, // Renamed from "الحسابات"
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

export const ACCOUNTING_NAV: NavSection[] = [
    {
        items: [
            { label: "لوحة المؤشرات", href: "/accounting", icon: LayoutDashboard }
        ]
    },
    {
        title: "العمليات اليومية",
        items: [
            { label: "الفواتير", href: "/accounting/invoices", icon: FileText },
            { label: "المدفوعات", href: "/accounting/payments", icon: DollarSign },
            { label: "دفاتر اليومية", href: "/accounting/journals", icon: ScrollText },
            { label: "قيد جديد", href: "/accounting/moves/create", icon: Calculator }
        ]
    },
    {
        title: "الإعدادات والبيانات",
        items: [
            { label: "دليل الحسابات", href: "/accounting/accounts", icon: BookOpen },
            { label: "الشركاء والموردين", href: "/accounting/partners", icon: Users }, // Renamed
            { label: "مراكز التكلفة", href: "/accounting/cost-centers", icon: Target },
            { label: "سجل الأحداث", href: "/accounting/backlog", icon: History }
        ]
    },
    {
        title: "التقارير",
        items: [
            { label: "مركز التقارير", href: "/accounting/reports", icon: FileBarChart }
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
            { label: "الطلبات", href: "/hr/requests", icon: FileText }
        ]
    },
    {
        title: "العمليات المالية",
        items: [
            { label: "الرواتب", href: "/hr/payroll", icon: DollarSign }
        ]
    },
    {
        title: "الاتصالات",
        items: [
            { label: "الإعلانات", href: "/hr/announcements", icon: Megaphone }
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
            { label: "التقارير", href: "/crm/reports", icon: PieChart }
        ]
    },
    {
        title: "الإعدادات",
        items: [
            { label: "إعدادات العملاء", href: "/crm/settings", icon: Settings } // Renamed
        ]
    }
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
    accounts: "حسابات المنصات", // Updated
    partners: "الشركاء والموردين",
    "cost-centers": "مراكز التكلفة",
    backlog: "سجل الأحداث",
    attendance: "الحضور والانصراف",
    requests: "الطلبات",
    payroll: "الرواتب",
    announcements: "الإعلانات",
    customers: "العملاء",
    deals: "الصفقات",
    roles: "صلاحيات الأدوار",
    "page-permissions": "صلاحيات الصفحات"
};
