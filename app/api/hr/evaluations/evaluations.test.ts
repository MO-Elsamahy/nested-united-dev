/**
 * Tests: Evaluations API (GET/POST /api/hr/evaluations)
 * Covers: Creation, score calculation, percentage logic, Transactional inserts.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'eval-uuid-123');

// Special mock for executeTransaction
const mockExecuteTransaction = vi.fn(async (callback) => {
    const connection = {
        execute: mockExecute
    };
    return await callback(connection);
});

vi.mock('@/lib/db', () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    queryOne: (...args: unknown[]) => mockQueryOne(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    executeTransaction: (callback: (connection: { execute: typeof mockExecute }) => Promise<unknown>) => mockExecuteTransaction(callback),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/hr/evaluations/route';

describe('Evaluations API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-001' },
        } as { user: { id: string } });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ── POST /api/hr/evaluations (Creation) ──────────────────────────────────
    describe('POST /api/hr/evaluations', () => {
        const payload = {
            employee_id: 'emp-1',
            template_id: 'temp-1',
            eval_month: 4,
            eval_year: 2026,
            notes: 'Good job',
            scores: [
                { criterion_id: 'c1', score: '4' },
                { criterion_id: 'c2', score: '5' }
            ]
        };

        it('calculates totals and percentage correctly', async () => {
            mockQueryOne.mockResolvedValueOnce(null); // No previous evaluation for this month
            mockQuery.mockResolvedValueOnce([
                { id: 'c1', max_score: '5' },
                { id: 'c2', max_score: '5' }
            ]); // Criteria definitions

            const res = await POST(new Request('http://localhost/api/hr/evaluations', {
                method: 'POST',
                body: JSON.stringify(payload)
            }));
            const body = await res?.json();

            expect(res?.status).toBe(200);
            expect(body.success).toBe(true);

            // Verify the header insert call (first call in transaction)
            const headerInsertCall = mockExecute.mock.calls.find(
                (c) => typeof c[0] === "string" && c[0].includes("INSERT INTO hr_evaluations")
            );
            expect(headerInsertCall).toBeDefined();
            // total_score = 4+5=9, max_possible = 5+5=10, percentage = 90
            expect(headerInsertCall![1]).toEqual(expect.arrayContaining([9, 10, 90]));

            // Verify individual score inserts (2 calls)
            const scoreInsertCalls = mockExecute.mock.calls.filter(c => c[0].includes('INSERT INTO hr_evaluation_scores'));
            expect(scoreInsertCalls).toHaveLength(2);
        });

        it('returns 400 if evaluation already exists for that month', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'existing' });
            const res = await POST(new Request('http://localhost/api/hr/evaluations', {
                method: 'POST',
                body: JSON.stringify(payload)
            }));
            expect(res?.status).toBe(400);
            expect((await res?.json()).error).toMatch(/الشهر/);
        });
    });

    // ── GET /api/hr/evaluations (Listing) ────────────────────────────────────
    describe('GET /api/hr/evaluations', () => {
        it('filters by scope=self', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'emp-1' });
            mockQuery.mockResolvedValueOnce([]);
            await GET(new Request('http://localhost/api/hr/evaluations?scope=self'));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND ev.employee_id = ?'), ['emp-1']);
        });

        it('filters by month and year', async () => {
            mockQuery.mockResolvedValueOnce([]);
            await GET(new Request('http://localhost/api/hr/evaluations?month=5&year=2026'));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND ev.eval_month = ?'), expect.arrayContaining([5]));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND ev.eval_year = ?'), expect.arrayContaining([2026]));
        });
    });
});
