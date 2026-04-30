/**
 * Tests: HR-to-Accounting Integration (GOSI Employer Contribution)
 * Covers: 3-line journal entry, rollback, config validation, edge cases
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockConnExecute = vi.fn();
const mockExecuteTransaction = vi.fn(async (cb: (conn: { execute: typeof mockConnExecute }) => Promise<void>) => {
    await cb({ execute: mockConnExecute });
});
let uuidCounter = 0;
const mockGenerateUUID = vi.fn(() => `uuid-${++uuidCounter}`);

vi.mock('@/lib/db', () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    queryOne: (...args: unknown[]) => mockQueryOne(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    executeTransaction: (cb: (conn: { execute: typeof mockConnExecute }) => Promise<void>) => mockExecuteTransaction(cb),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('@/lib/hr-payroll-run-logs', () => ({
    insertHrPayrollRunLog: vi.fn().mockResolvedValue(undefined),
    ensureHrPayrollRunLogsTable: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { PUT } from '@/app/api/hr/payroll/[id]/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makePayrollRun = (overrides = {}) => ({
    id: 'payroll-001',
    status: 'draft',
    total_amount: 100000,
    period_month: 1,
    period_year: 2026,
    total_employees: 10,
    ...overrides,
});

const makeSettings = (overrides: Record<string, string | null> = {}) => {
    const base: Record<string, string | null> = {
        salary_expense_account_id: 'acc-salary-expense',
        salary_payable_account_id: 'acc-salary-payable',
        salary_journal_id: 'journal-sal',
        gosi_employer_rate: '12.5',
        gosi_expense_account_id: null, // default: not configured
    };
    return Object.entries({ ...base, ...overrides }).map(([k, v]) => ({
        setting_key: k, setting_value: v,
    }));
};

const approveRequest = (id = 'payroll-001') =>
    new Request(`http://localhost/api/hr/payroll/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'approve' }),
    });

// Mock the GOSI aggregate (gosiBase = sum of basic+housing per employee)
const mockGosiAggregate = (gosiBase: number) =>
    mockQuery.mockResolvedValueOnce([{ gosi_base: gosiBase }]);

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('HR Payroll Approval — Accounting Integration', () => {
    beforeAll(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-001', name: 'محمد' },
        } as { user: { id: string; name: string } });
    });

    beforeEach(() => {
        // Re-initialize UUID mock after any possible reset
        mockGenerateUUID.mockImplementation(() => `uuid-${++uuidCounter}`);
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Also drain any leftover mockOnce queues
        mockQuery.mockReset();
        mockQueryOne.mockReset();
        mockExecute.mockReset();
        mockConnExecute.mockReset();
        mockExecuteTransaction.mockClear();
        uuidCounter = 0;
        // Restore UUID mock after reset
        mockGenerateUUID.mockImplementation(() => `uuid-${++uuidCounter}`);
    });

    // ── Happy path without employer GOSI account ─────────────────────────────

    it('creates 2-line journal entry when gosi_expense_account_id is NULL', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun());
        mockQuery.mockResolvedValueOnce(makeSettings()); // no gosi account
        mockGosiAggregate(60000); // gosiBase = 60k
        mockExecute.mockResolvedValue({});

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);

        const moveLineCalls = mockExecute.mock.calls.filter(([sql]) =>
            String(sql).includes('INSERT INTO accounting_move_lines')
        );
        // Should have exactly 2 lines: debit expense + credit payable
        expect(moveLineCalls).toHaveLength(2);

        // Line 1: debit salary expense = 100000
        expect(moveLineCalls[0][1]).toEqual(expect.arrayContaining(['acc-salary-expense', 100000, 0]));
        // Line 2: credit payable = 100000 (no gosi since account not configured)
        expect(moveLineCalls[1][1]).toEqual(expect.arrayContaining(['acc-salary-payable', 0, 100000]));
    });

    // ── Happy path WITH employer GOSI account configured ──────────────────────

    it('creates 3-line journal entry when gosi_expense_account_id is set', async () => {
        const gosiBase = 60000; // basic + housing across all employees
        const employerGosiRate = 12.5;
        const employerGosi = gosiBase * (employerGosiRate / 100); // 7500
        const netSalary = 100000;
        const totalLiability = netSalary + employerGosi; // 107500

        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ total_amount: netSalary }));
        mockQuery.mockResolvedValueOnce(makeSettings({
            gosi_expense_account_id: 'acc-gosi-employer',
        }));
        mockGosiAggregate(gosiBase);
        mockExecute.mockResolvedValue({});

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.employer_gosi_amount).toBeCloseTo(7500);

        const moveLineCalls = mockExecute.mock.calls.filter(([sql]) =>
            String(sql).includes('INSERT INTO accounting_move_lines')
        );
        expect(moveLineCalls).toHaveLength(3);

        // Line 1: debit salary expense = 100000 (net to employees)
        expect(moveLineCalls[0][1]).toEqual(expect.arrayContaining(['acc-salary-expense', netSalary, 0]));

        // Line 2: debit employer GOSI = 7500
        expect(moveLineCalls[1][1]).toEqual(expect.arrayContaining(['acc-gosi-employer', employerGosi, 0]));

        // Line 3: credit payable = 107500 (total cash outflow)
        expect(moveLineCalls[2][1]).toEqual(expect.arrayContaining(['acc-salary-payable', 0, totalLiability]));
    });

    // ── Double-entry balance check ─────────────────────────────────────────────

    it('total debits == total credits in the 3-line journal entry', async () => {
        const net = 85000;
        const gosiBase = 50000;
        const employerGosi = gosiBase * 0.125; // 6250
        const totalCredit = net + employerGosi; // 91250

        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ total_amount: net }));
        mockQuery.mockResolvedValueOnce(makeSettings({ gosi_expense_account_id: 'acc-gosi' }));
        mockGosiAggregate(gosiBase);
        mockExecute.mockResolvedValue({});

        await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });

        const moveLineCalls = mockExecute.mock.calls.filter(([sql]) =>
            String(sql).includes('INSERT INTO accounting_move_lines')
        );

        const totalDebits = moveLineCalls.reduce((s, [, args]) => s + (args[4] || 0), 0);
        const totalCredits = moveLineCalls.reduce((s, [, args]) => s + (args[5] || 0), 0);

        expect(totalDebits).toBeCloseTo(totalCredit);   // 91250
        expect(totalCredits).toBeCloseTo(totalCredit);  // 91250
        expect(totalDebits).toBeCloseTo(totalCredits);
    });

    // ── Edge: zero total amount ────────────────────────────────────────────────

    it('handles zero-amount payroll gracefully (still creates journal)', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ total_amount: 0, total_employees: 0 }));
        mockQuery.mockResolvedValueOnce(makeSettings());
        mockGosiAggregate(0);
        mockExecute.mockResolvedValue({});

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        expect(res.status).toBe(200);
    });

    // ── Validation: accounting not configured ─────────────────────────────────

    it('rejects approval if salary_expense_account_id is missing', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun());
        mockQuery.mockResolvedValueOnce(makeSettings({
            salary_expense_account_id: null,
        }));
        mockGosiAggregate(0);

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.details.missing.expense_account).toBe(true);
    });

    it('rejects approval if all accounts missing', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun());
        mockQuery.mockResolvedValueOnce(makeSettings({
            salary_expense_account_id: null,
            salary_payable_account_id: null,
            salary_journal_id: null,
        }));
        mockGosiAggregate(0);

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.details.missing).toMatchObject({
            expense_account: true,
            payable_account: true,
            journal: true,
        });
    });

    // ── Rollback on DB failure ────────────────────────────────────────────────

    it('rolls back payroll status if accounting_moves INSERT fails', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun());
        mockQuery.mockResolvedValueOnce(makeSettings());
        mockGosiAggregate(60000);

        // Sequence: (1) UPDATE status → OK, (2) INSERT accounting_moves → throws, (3) rollback UPDATE → OK
        mockExecute
            .mockResolvedValueOnce({})               // (1) approve
            .mockRejectedValueOnce(new Error('DB timeout')) // (2) INSERT fails
            .mockResolvedValueOnce({});              // (3) rollback

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(500);
        // The route returns Arabic error text — match loosely
        expect(body.error).toBeTruthy();

        // Verify rollback was called
        const rollbackCall = mockExecute.mock.calls.find(([sql]) =>
            String(sql).includes("SET status = 'draft'")
        );
        expect(rollbackCall).toBeDefined();
        expect(rollbackCall![1]).toEqual(['payroll-001']);
    });

    // ── Reject already-approved payroll ───────────────────────────────────────

    it('rejects approving a non-draft payroll', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ status: 'approved' }));
        mockQuery.mockResolvedValueOnce(makeSettings());
        mockGosiAggregate(0);

        const res = await PUT(approveRequest(), { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toMatch(/draft/i);
    });

    // ── Delete action ─────────────────────────────────────────────────────────

    it('deletes a draft payroll', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ status: 'draft' }));
        mockExecute.mockResolvedValue({});

        const req = new Request('http://localhost/api/hr/payroll/payroll-001', {
            method: 'PUT',
            body: JSON.stringify({ action: 'delete' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);

        const delCall = mockExecute.mock.calls.find(([sql]) =>
            String(sql).includes('DELETE FROM hr_payroll_runs')
        );
        expect(delCall).toBeDefined();
    });

    it('prevents deleting an approved payroll', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ status: 'approved' }));

        const req = new Request('http://localhost/api/hr/payroll/payroll-001', {
            method: 'PUT',
            body: JSON.stringify({ action: 'delete' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: 'payroll-001' }) });

        expect(res.status).toBe(400);
    });

    it('reverts approval: soft-deletes move and returns to draft', async () => {
        mockQueryOne.mockResolvedValueOnce(
            makePayrollRun({
                status: 'approved',
                accounting_move_id: 'move-abc',
            })
        );
        mockConnExecute.mockResolvedValue([{ affectedRows: 1 } as { affectedRows: number }, []]);

        const req = new Request('http://localhost/api/hr/payroll/payroll-001', {
            method: 'PUT',
            body: JSON.stringify({ action: 'revert_approval', note: 'تصحيح بعد مراجعة' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: 'payroll-001' }) });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockExecuteTransaction).toHaveBeenCalledTimes(1);

        const sqlCalls = mockConnExecute.mock.calls.map((c) => String(c[0]));
        expect(sqlCalls.some((s) => s.includes('UPDATE accounting_moves SET deleted_at'))).toBe(true);
        expect(sqlCalls.some((s) => s.includes("SET status = 'draft'") && s.includes('hr_payroll_runs'))).toBe(
            true
        );
        expect(sqlCalls.some((s) => s.includes('salary_confirmed_at = NULL'))).toBe(true);
    });

    it('rejects revert_approval when payroll is still draft', async () => {
        mockQueryOne.mockResolvedValueOnce(makePayrollRun({ status: 'draft' }));

        const req = new Request('http://localhost/api/hr/payroll/payroll-001', {
            method: 'PUT',
            body: JSON.stringify({ action: 'revert_approval' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: 'payroll-001' }) });

        expect(res.status).toBe(400);
        expect(mockExecuteTransaction).not.toHaveBeenCalled();
    });
});
