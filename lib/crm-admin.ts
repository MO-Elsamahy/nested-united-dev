/** Roles allowed to see CRM reports and CRM customer settings (tags, pipeline stages). */
const CRM_REPORTS_AND_SETTINGS_ROLES = new Set(["super_admin", "hr_manager"]);

export function canAccessCrmReportsAndSettings(role: string | undefined | null): boolean {
    if (!role) return false;
    return CRM_REPORTS_AND_SETTINGS_ROLES.has(role);
}
