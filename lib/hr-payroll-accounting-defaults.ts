import { queryOne } from "@/lib/db";

export type PayrollAccountingIds = {
    salaryJournalId: string | null;
    salaryExpenseAccountId: string | null;
    salaryPayableAccountId: string | null;
};

function unknownColumnError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err || "");
    const errno = typeof err === "object" && err !== null ? (err as Record<string, unknown>).errno : undefined;
    return errno === 1054 || msg.includes("Unknown column") || msg.includes("deleted_at");
}

async function queryOneFlexible<T>(sqlWithDeleted: string, sqlNoDeleted: string): Promise<T | null> {
    try {
        return await queryOne<T>(sqlWithDeleted);
    } catch (err) {
        if (!unknownColumnError(err)) throw err;
        return await queryOne<T>(sqlNoDeleted);
    }
}

/**
 * When HR settings leave journal/accounts empty, resolve standard "SAL" wiring
 * from accounting_journals / accounting_accounts so payroll approval posts
 * into the financial module (يومية الرواتب والأجور — SAL) without manual mapping.
 */
export async function resolvePayrollAccountingIntegration(
    settings: Record<string, string | undefined | null>
): Promise<PayrollAccountingIds> {
    const trim = (v: string | undefined | null) => (typeof v === "string" ? v.trim() : "") || null;

    let salaryJournalId = trim(settings["salary_journal_id"]);
    let salaryExpenseAccountId = trim(settings["salary_expense_account_id"]);
    let salaryPayableAccountId = trim(settings["salary_payable_account_id"]);

    if (!salaryJournalId) {
        const j = await queryOneFlexible<{ id: string }>(
            `SELECT id FROM accounting_journals
             WHERE deleted_at IS NULL
               AND (
                 UPPER(TRIM(IFNULL(code,''))) = 'SAL'
                 OR UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL-%'
                 OR name LIKE '%الرواتب والأجور%'
                 OR name LIKE '%رواتب والأجور%'
                 OR LOWER(IFNULL(type,'')) = 'salary'
                 OR LOWER(IFNULL(type,'')) LIKE '%salary%'
               )
             ORDER BY CASE WHEN UPPER(TRIM(IFNULL(code,''))) = 'SAL' THEN 0 ELSE 1 END, name ASC
             LIMIT 1`,
            `SELECT id FROM accounting_journals
             WHERE (
                 UPPER(TRIM(IFNULL(code,''))) = 'SAL'
                 OR UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL-%'
                 OR name LIKE '%الرواتب والأجور%'
                 OR name LIKE '%رواتب والأجور%'
                 OR LOWER(IFNULL(type,'')) = 'salary'
                 OR LOWER(IFNULL(type,'')) LIKE '%salary%'
               )
             ORDER BY CASE WHEN UPPER(TRIM(IFNULL(code,''))) = 'SAL' THEN 0 ELSE 1 END, name ASC
             LIMIT 1`
        );
        salaryJournalId = j?.id ?? null;
    }

    if (!salaryExpenseAccountId) {
        const a = await queryOneFlexible<{ id: string }>(
            `SELECT id FROM accounting_accounts
             WHERE deleted_at IS NULL
               AND (
                 UPPER(TRIM(IFNULL(code,''))) = 'SAL'
                 OR UPPER(IFNULL(code,'')) LIKE 'SAL.%'
                 OR UPPER(IFNULL(code,'')) LIKE 'SAL-%'
                 OR name LIKE '%الرواتب والأجور%'
                 OR name LIKE '%رواتب والأجور%'
                 OR name LIKE '%رواتب وأجور%'
                 OR (type IN ('expense','cost_of_sales') AND (name LIKE '%راتب%' OR name LIKE '%أجور%' OR name LIKE '%رواتب%'))
               )
             ORDER BY
               CASE WHEN UPPER(TRIM(IFNULL(code,''))) = 'SAL' THEN 0
                    WHEN name LIKE '%الرواتب والأجور%' THEN 1
                    WHEN type IN ('expense','cost_of_sales') THEN 2
                    ELSE 3 END,
               name ASC
             LIMIT 1`,
            `SELECT id FROM accounting_accounts
             WHERE (
                 UPPER(TRIM(IFNULL(code,''))) = 'SAL'
                 OR UPPER(IFNULL(code,'')) LIKE 'SAL.%'
                 OR UPPER(IFNULL(code,'')) LIKE 'SAL-%'
                 OR name LIKE '%الرواتب والأجور%'
                 OR name LIKE '%رواتب والأجور%'
                 OR name LIKE '%رواتب وأجور%'
                 OR (type IN ('expense','cost_of_sales') AND (name LIKE '%راتب%' OR name LIKE '%أجور%' OR name LIKE '%رواتب%'))
               )
             ORDER BY
               CASE WHEN UPPER(TRIM(IFNULL(code,''))) = 'SAL' THEN 0
                    WHEN name LIKE '%الرواتب والأجور%' THEN 1
                    WHEN type IN ('expense','cost_of_sales') THEN 2
                    ELSE 3 END,
               name ASC
             LIMIT 1`
        );
        salaryExpenseAccountId = a?.id ?? null;
    }

    if (!salaryPayableAccountId) {
        const p = await queryOneFlexible<{ id: string }>(
            `SELECT id FROM accounting_accounts
             WHERE deleted_at IS NULL
               AND (
                 UPPER(TRIM(IFNULL(code,''))) IN ('SAL-PAY', 'SALAP', 'SAL-PY', 'SAL-CRED', 'SALPAY')
                 OR UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL-%PAY%'
                 OR (name LIKE '%رواتب%' AND name LIKE '%مستحقة%')
                 OR name LIKE '%أجور مستحقة%'
                 OR name LIKE '%رواتب مستحقة%'
                 OR name LIKE '%مستحقات أجور%'
                 OR (
                   type IN ('liability_payable','liability_current','liability','liability_non_current')
                   AND (name LIKE '%راتب%' OR name LIKE '%أجور%' OR name LIKE '%رواتب%')
                 )
               )
             ORDER BY
               CASE WHEN UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL%' THEN 0
                    WHEN name LIKE '%مستحقة%' OR name LIKE '%مستحقات%' THEN 1
                    WHEN type = 'liability_payable' THEN 2
                    ELSE 3 END,
               name ASC
             LIMIT 1`,
            `SELECT id FROM accounting_accounts
             WHERE (
                 UPPER(TRIM(IFNULL(code,''))) IN ('SAL-PAY', 'SALAP', 'SAL-PY', 'SAL-CRED', 'SALPAY')
                 OR UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL-%PAY%'
                 OR (name LIKE '%رواتب%' AND name LIKE '%مستحقة%')
                 OR name LIKE '%أجور مستحقة%'
                 OR name LIKE '%رواتب مستحقة%'
                 OR name LIKE '%مستحقات أجور%'
                 OR (
                   type IN ('liability_payable','liability_current','liability','liability_non_current')
                   AND (name LIKE '%راتب%' OR name LIKE '%أجور%' OR name LIKE '%رواتب%')
                 )
               )
             ORDER BY
               CASE WHEN UPPER(TRIM(IFNULL(code,''))) LIKE 'SAL%' THEN 0
                    WHEN name LIKE '%مستحقة%' OR name LIKE '%مستحقات%' THEN 1
                    WHEN type = 'liability_payable' THEN 2
                    ELSE 3 END,
               name ASC
             LIMIT 1`
        );
        salaryPayableAccountId = p?.id ?? null;
    }

    return { salaryJournalId, salaryExpenseAccountId, salaryPayableAccountId };
}
