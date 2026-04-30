import { 
    DASHBOARD_NAV, 
    ACCOUNTING_NAV, 
    HR_NAV, 
    CRM_NAV, 
    SETTINGS_NAV,
    NavSection
} from "./navigation-config";

export interface SearchablePage {
    label: string;
    subtitle: string;
    href: string;
    keywords: string[];
    requiresSuperAdmin: boolean;
    /** If set, only these roles see this shortcut in global search. */
    allowedRoles?: string[];
}

function flattenNav(sections: NavSection[], moduleName: string): SearchablePage[] {
    const pages: SearchablePage[] = [];
    
    sections.forEach(section => {
        section.items.forEach(item => {
            pages.push({
                label: item.label,
                subtitle: section.title ? `${moduleName} → ${section.title}` : moduleName,
                href: item.href,
                keywords: [
                    item.label.toLowerCase(),
                    moduleName.toLowerCase(),
                    ...(section.title ? [section.title.toLowerCase()] : []),
                    // Add more smart keywords based on href
                    ...item.href.split('/').filter(p => p && p !== 'dashboard' && p !== moduleName.toLowerCase())
                ],
                requiresSuperAdmin: !!item.requiresSuperAdmin,
                allowedRoles: item.allowedRoles,
            });
        });
    });
    
    return pages;
}

export function getSearchablePages(): SearchablePage[] {
    return [
        ...flattenNav(DASHBOARD_NAV, "إدارة التأجير"),
        ...flattenNav(ACCOUNTING_NAV, "المحاسبة"),
        ...flattenNav(HR_NAV, "الموارد البشرية"),
        ...flattenNav(CRM_NAV, "إدارة العملاء"),
        ...flattenNav(SETTINGS_NAV, "الإعدادات"),
    ];
}

// Arabic normalization for search
export function normalizeSearchText(text: string): string {
    if (!text) return "";
    return text
        .normalize("NFKC")
        .replace(/[أإآ]/g, 'ا')
        .replace(/[ة]/g, 'ه')
        .replace(/[ى]/g, 'ي')
        .replace(/[\u064B-\u065F]/g, '') // Remove harakat
        .trim()
        .toLowerCase();
}
