import { query } from "@/lib/db";

/**
 * Build a settings map from hr_settings rows. When duplicate setting_key exist
 * (e.g. INSERT without UNIQUE on setting_key), the newest updated_at wins.
 */
export function hrSettingsRowsToMap(rows: any[] | null | undefined): Record<string, string | undefined | null> {
    const out: Record<string, string | undefined | null> = {};
    if (!rows?.length) return out;
    for (const s of rows) {
        const k = s.setting_key;
        if (k == null || out[k] !== undefined) continue;
        out[k] = s.setting_value;
    }
    return out;
}

export async function loadHrSettingsMap(): Promise<Record<string, string | undefined | null>> {
    const rows = await query<any>(`SELECT * FROM hr_settings ORDER BY updated_at DESC`);
    return hrSettingsRowsToMap(rows);
}
