/**
 * Tests: HR Requests API (GET/POST /api/hr/requests and PUT /api/hr/requests/[id])
 * Covers: Creation, days_count calculation, role-based listing, Approval/Rejection, balance deduction.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'req-uuid-123');

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
    queryOne: (...args: any[]) => mockQueryOne(...args),
    execute: (...args: any[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/hr/requests/route';
import { PUT } from '@/app/api/hr/requests/[id]/route';

describe('HR Requests API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-001', role: 'employee' },
        } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ── POST /api/hr/requests (Creation) ────────────────────────────────────
    describe('POST /api/hr/requests', () => {
        it('calculates days_count correctly (single day)', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'emp-1' }); // Current user's employee record
            mockExecute.mockResolvedValueOnce({});

            const res = await POST(new Request('http://localhost/api/hr/requests', {
                method: 'POST',
                body: JSON.stringify({
                    request_type: 'annual_leave',
                    start_date: '2026-05-01',
                    end_date: '2026-05-01',
                    reason: 'Vacation'
                })
            }));
            const body = await res?.json();

            expect(res?.status).toBe(200);
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO hr_requests'),
                expect.arrayContaining(['2026-05-01', '2026-05-01', 1]) // 1 day
            );
        });

        it('calculates days_count correctly (multi day)', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'emp-1' });
            const res = await POST(new Request('http://localhost/api/hr/requests', {
                method: 'POST',
                body: JSON.stringify({
                    request_type: 'annual_leave',
                    start_date: '2026-05-01',
                    end_date: '2026-05-05',
                    reason: 'Vacation'
                })
            }));
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO hr_requests'),
                expect.arrayContaining(['2026-05-01', '2026-05-05', 5]) // 1, 2, 3, 4, 5 = 5 days
            );
        });

        it('returns 403 if no employee record found for user', async () => {
            mockQueryOne.mockResolvedValueOnce(null);
            const res = await POST(new Request('http://localhost/api/hr/requests', {
                method: 'POST',
                body: JSON.stringify({ request_type: 'annual_leave', start_date: '2026-05-01', reason: 'X' })
            }));
            expect(res?.status).toBe(403);
            expect((await res?.json()).error).toMatch(/لا يوجد ملف موظف مرتبط بحسابك/);
        });
    });

    // ── GET /api/hr/requests (Listing) ───────────────────────────────────────
    describe('GET /api/hr/requests', () => {
        it('filters by scope=self', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'emp-1' });
            mockQuery.mockResolvedValueOnce([]);
            await GET(new Request('http://localhost/api/hr/requests?scope=self'));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE r.employee_id = ?'), ['emp-1']);
        });

        it('admin view list all', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: 'emp-1' }); // current user
            mockQuery.mockResolvedValueOnce([]);
            await GET(new Request('http://localhost/api/hr/requests'));
            expect(mockQuery).not.toHaveBeenCalledWith(expect.stringContaining('WHERE r.employee_id = ?'), expect.any(Array));
        });
    });

    // ── PUT /api/hr/requests/[id] (Approval) ──────────────────────────────────
    describe('PUT /api/hr/requests/[id]', () => {
        const reqId = 'req-123';
        const params = Promise.resolve({ id: reqId });

        it('deducts annual_leave_balance on approval', async () => {
            mockExecute.mockResolvedValueOnce({}); // Update request status
            mockQueryOne.mockResolvedValueOnce({ 
                id: reqId, 
                employee_id: 'emp-1', 
                request_type: 'annual_leave', 
                days_count: 5 
            });
            mockExecute.mockResolvedValueOnce({}); // Deduct balance

            const res = await PUT(new Request(`http://localhost/api/hr/requests/${reqId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'approved', reviewer_notes: 'Enjoy' })
            }), { params });

            expect(res?.status).toBe(200);
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE hr_employees SET annual_leave_balance = annual_leave_balance - ?'),
                [5, 'emp-1']
            );
        });

        it('does NOT deduct balance on rejection', async () => {
            mockExecute.mockResolvedValueOnce({});
            const res = await PUT(new Request(`http://localhost/api/hr/requests/${reqId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'rejected' })
            }), { params });

            expect(mockQueryOne).not.toHaveBeenCalled();
            expect(mockExecute).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE hr_employees'), expect.any(Array));
        });
    });
});
