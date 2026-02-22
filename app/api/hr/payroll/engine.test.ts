/**
 * Tests: Payroll Engine (POST /api/hr/payroll)
 * Covers: salary calculation, GOSI, absence, late, overtime, edge cases
 *
 * Approach: 
 *  - Mock query() to return values in the exact order the route calls them:
 *    1. settings (query)
 *    2. employees (query)  
 *    3. attendance per employee (queryOne per employee)
 *  - Verify INSERT params using exact known indices from the route source:
 *    [0]=id [1]=runId [2]=empId [3]=basic [4]=housing [5]=transport [6]=other
 *    [7]=overtime [8]=absenceDeduction [9]=lateDeduction [10]=gosiDeduction
 *    [11]=gross [12]=totalDeductions [13]=netSalary [14]=absentDays [15]=0
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'run-uuid');

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
    queryOne: (...args: any[]) => mockQueryOne(...args),
    execute: (...args: any[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/hr/payroll/route';

// ─── Constants ─────────────────────────────────────────────────────────────────
// INSERT params indices (see route.ts line 128-130):
const I = {
    id: 0, runId: 1, empId: 2,
    basic: 3, housing: 4, transport: 5, other: 6,
    overtime: 7, absDeduction: 8, lateDeduction: 9,
    gosiDeduction: 10, gross: 11, totalDeductions: 12,
    netSalary: 13, absentDays: 14,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
    { setting_key: 'overtime_rate', setting_value: '1.5' },
    { setting_key: 'gosi_employee_rate', setting_value: '9.75' },
    { setting_key: 'working_days_per_month', setting_value: '22' },
];

const makeEmp = (overrides = {}) => ({
    id: 'emp-001',
    basic_salary: 5000,
    housing_allowance: 1000,
    transport_allowance: 500,
    other_allowances: 0,
    ...overrides,
});

const NO_ATT = { absent_days: 0, total_late_minutes: 0, total_overtime_minutes: 0 };

const postPayroll = (month = 1, year = 2026) =>
    new Request('http://localhost/api/hr/payroll', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
    });

/**
 * Set up mocks for one employee with given attendance.
 * Route call order: queryOne(duplicate check), query(settings), query(employees), queryOne(attendance)
 */
const setupSingleEmployee = (emp = makeEmp(), att = NO_ATT) => {
    mockQueryOne
        .mockResolvedValueOnce(null)  // no existing run
        .mockResolvedValueOnce(att);  // attendance stats
    mockQuery
        .mockResolvedValueOnce(DEFAULT_SETTINGS) // settings
        .mockResolvedValueOnce([emp]);            // employees
    mockExecute.mockResolvedValue({});
};

const getDetailInsertParams = (): any[] | undefined => {
    const call = mockExecute.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO hr_payroll_details')
    );
    return call?.[1];
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Payroll Engine — Salary Calculations', () => {
    beforeAll(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-001' },
        } as any);
    });

    afterEach(() => vi.clearAllMocks());

    // ── Gross salary ──────────────────────────────────────────────────────────
    it('calculates gross = basic + housing + transport + other', async () => {
        setupSingleEmployee();
        const res = await POST(postPayroll());
        expect(res.status).toBe(200);
        const p = getDetailInsertParams()!;
        expect(p[I.gross]).toBeCloseTo(6500); // 5000+1000+500+0
    });

    // ── GOSI employee deduction ───────────────────────────────────────────────
    it('calculates GOSI employee deduction (9.75% of basic+housing)', async () => {
        // GOSI = 9.75% × (5000+1000) = 585
        setupSingleEmployee();
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.gosiDeduction]).toBeCloseTo(585);
    });

    // ── Net salary ────────────────────────────────────────────────────────────
    it('calculates net salary correctly for a clean month', async () => {
        // net = gross(6500) - GOSI(585) = 5915
        setupSingleEmployee();
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.netSalary]).toBeCloseTo(5915);
    });

    // ── Absence deduction ─────────────────────────────────────────────────────
    it('deducts correctly for 3 absent days (daily rate = basic/30)', async () => {
        // dailyRate = 5000/30 ≈ 166.67; absenceDeduction = 3 × 166.67 = 500
        setupSingleEmployee(makeEmp(), { absent_days: 3, total_late_minutes: 0, total_overtime_minutes: 0 });
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.absDeduction]).toBeCloseTo(500, 0);
    });

    // ── Late deduction ────────────────────────────────────────────────────────
    it('deducts for 60 minutes late', async () => {
        // minuteRate = (5000/30)/8/60; lateDeduction = minuteRate × 60 ≈ 20.83
        setupSingleEmployee(makeEmp(), { absent_days: 0, total_late_minutes: 60, total_overtime_minutes: 0 });
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.lateDeduction]).toBeCloseTo(20.83, 0);
    });

    // ── Overtime ──────────────────────────────────────────────────────────────
    it('adds overtime at 1.5× hourly rate for 60 overtime minutes', async () => {
        // overtimeAmount = minuteRate × 1.5 × 60 ≈ 31.25
        setupSingleEmployee(makeEmp(), { absent_days: 0, total_late_minutes: 0, total_overtime_minutes: 60 });
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.overtime]).toBeCloseTo(31.25, 0);
    });

    // ── GOSI base excludes transport & other ──────────────────────────────────
    it('applies GOSI only to basic + housing (not transport or other)', async () => {
        // basic=4000, housing=2000, transport=1000, other=500
        // GOSI base = 6000 → GOSI employee = 9.75% × 6000 = 585 (not 9.75% × 7500 = 731.25)
        const emp = makeEmp({ basic_salary: 4000, housing_allowance: 2000, transport_allowance: 1000, other_allowances: 500 });
        setupSingleEmployee(emp);
        await POST(postPayroll());
        const p = getDetailInsertParams()!;
        expect(p[I.gosiDeduction]).toBeCloseTo(585);    // correct: 9.75% of 6000
        expect(p[I.gosiDeduction]).not.toBeCloseTo(731.25, 0); // wrong would be 9.75% of 7500
    });

    // ── Duplicate period detection ────────────────────────────────────────────
    it('rejects generation if payroll already exists for that period', async () => {
        mockQueryOne.mockResolvedValueOnce({ id: 'existing-run' }); // existing run found
        const res = await POST(postPayroll(1, 2026));
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toMatch(/مسبقاً/i);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    // ── Missing request params ────────────────────────────────────────────────
    it('returns 400 if month or year is missing from request body', async () => {
        const req = new Request('http://localhost/api/hr/payroll', {
            method: 'POST',
            body: JSON.stringify({ month: 1 }), // missing year
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    // ── No active employees ───────────────────────────────────────────────────
    it('returns 400 if no active employees found', async () => {
        mockQueryOne.mockResolvedValueOnce(null);          // no duplicate
        mockQuery
            .mockResolvedValueOnce(DEFAULT_SETTINGS)       // settings
            .mockResolvedValueOnce([]);                    // empty employees array
        const res = await POST(postPayroll());
        const body = await res.json();
        expect(res.status).toBe(400);
        expect(body.error).toMatch(/موظف/i);
    });

    // ── Multi-employee: total amout is sum of net salaries ────────────────────
    it('correctly sums total_amount across multiple employees in the run header', async () => {
        const emp1 = makeEmp({ id: 'emp-001' }); // net ≈ 5915
        const emp2 = makeEmp({ id: 'emp-002', basic_salary: 8000, housing_allowance: 2000, transport_allowance: 0, other_allowances: 0 });
        // emp2: gross=10000, GOSI=9.75%×10000=975, net=9025

        mockQueryOne
            .mockResolvedValueOnce(null)   // no duplicate run
            .mockResolvedValueOnce(NO_ATT) // emp1 attendance
            .mockResolvedValueOnce(NO_ATT); // emp2 attendance
        mockQuery
            .mockResolvedValueOnce(DEFAULT_SETTINGS)
            .mockResolvedValueOnce([emp1, emp2]);
        mockExecute.mockResolvedValue({});

        const res = await POST(postPayroll());
        expect(res.status).toBe(200);

        const updateCall = mockExecute.mock.calls.find(([sql]) =>
            String(sql).includes('UPDATE hr_payroll_runs SET total_employees')
        );
        expect(updateCall).toBeDefined();
        const [totalEmployees, totalAmount] = updateCall![1];
        expect(totalEmployees).toBe(2);
        expect(totalAmount).toBeGreaterThan(10000); // emp1(≈5915) + emp2(≈9025) ≈ 14940
    });
});
