/**
 * Tests: Attendance Punch API (POST /api/hr/attendance/punch)
 * Covers: Check-in, Check-out, Late detection, Overtime calculation, Shift logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'attendance-uuid-123');

vi.mock('@/lib/db', () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    queryOne: (...args: unknown[]) => mockQueryOne(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/hr/attendance/punch/route';

describe('Attendance Punch API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-001' },
        } as { user: { id: string } });
        // Default time: 2026-04-10 08:30:00 (present for 09:00 shift)
        // Use local time instead of UTC 'Z' to match now.getHours() in route
        vi.setSystemTime(new Date(2026, 3, 10, 8, 30, 0)); // Month is 0-indexed
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.useRealTimers();
    });

    const punchInRequest = (empId = 'emp-1') => new Request('http://localhost/api/hr/attendance/punch', {
        method: 'POST',
        body: JSON.stringify({ employee_id: empId, type: 'check_in' })
    });

    const punchOutRequest = (empId = 'emp-1') => new Request('http://localhost/api/hr/attendance/punch', {
        method: 'POST',
        body: JSON.stringify({ employee_id: empId, type: 'check_out' })
    });

    // ── Validation ────────────────────────────────────────────────────────────
    it('returns 400 if missing data', async () => {
        const res = await POST(new Request('http://localhost/api/hr/attendance/punch', {
            method: 'POST',
            body: JSON.stringify({ employee_id: 'emp-1' }) // Missing type
        }));
        expect(res?.status).toBe(400);
    });

    // ── Check-In Logic ────────────────────────────────────────────────────────
    describe('Check-In', () => {
        it('marks as PRESENT when arriving before shift start', async () => {
            mockQueryOne
                .mockResolvedValueOnce(null) // No existing record for today
                .mockResolvedValueOnce({ shift_id: 'shift-1' }) // Employee shift
                .mockResolvedValueOnce({ start_time: '09:00:00', late_grace_minutes: 15 }); // Shift info

            const res = await POST(punchInRequest());
            const body = await res?.json();

            expect(res?.status).toBe(200);
            expect(body.status).toBe('present');
            expect(body.late_minutes).toBe(0);
        });

        it('marks as PRESENT when arriving within grace period (e.g. 09:10 for 09:00 shift)', async () => {
            vi.setSystemTime(new Date(2026, 3, 10, 9, 10, 0));
            mockQueryOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ shift_id: 'shift-1' })
                .mockResolvedValueOnce({ start_time: '09:00:00', late_grace_minutes: 15 });

            const res = await POST(punchInRequest());
            const body = await res?.json();

            expect(body.status).toBe('present'); // Arrived at 9:10, grace is till 9:15
        });

        it('marks as LATE when arriving after grace period (e.g. 09:20 for 09:00 shift)', async () => {
            vi.setSystemTime(new Date(2026, 3, 10, 9, 20, 0));
            mockQueryOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ shift_id: 'shift-1' })
                .mockResolvedValueOnce({ start_time: '09:00:00', late_grace_minutes: 15 });

            const res = await POST(punchInRequest());
            const body = await res?.json();

            expect(body.status).toBe('late');
            expect(body.late_minutes).toBe(20); // Late relative to shift start
        });

        it('falls back to global settings if no shift_id', async () => {
            mockQueryOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ shift_id: null }) // No shift
                .mockResolvedValueOnce({ setting_value: '08:00:00' }) // work_start_time
                .mockResolvedValueOnce({ setting_value: '16:00:00' }) // work_end_time
                .mockResolvedValueOnce({ setting_value: '10' });     // late_grace_minutes

            vi.setSystemTime(new Date(2026, 3, 10, 8, 15, 0)); // 15 mins late

            const res = await POST(punchInRequest());
            const body = await res?.json();

            expect(body.status).toBe('late');
            expect(body.late_minutes).toBe(15);
        });

        it('prevents duplicate check-in', async () => {
            mockQueryOne.mockResolvedValueOnce({ check_in: 'some-time' });
            const res = await POST(punchInRequest());
            expect(res?.status).toBe(400);
            expect((await res?.json()).error).toMatch(/مسبقاً/);
        });
    });

    // ── Check-Out Logic ───────────────────────────────────────────────────────
    describe('Check-Out', () => {
        it('calculates OVERTIME when leaving after shift end', async () => {
            // Arrived today
            mockQueryOne
                .mockResolvedValueOnce({ check_in: '09:00:00' })
                .mockResolvedValueOnce({ shift_id: 'shift-1' })
                .mockResolvedValueOnce({ end_time: '17:00:00' }); // Shift end

            vi.setSystemTime(new Date(2026, 3, 10, 18, 30, 0)); // 1.5 hours OT

            const res = await POST(punchOutRequest());
            const body = await res?.json();

            expect(res?.status).toBe(200);
            expect(body.overtime_minutes).toBe(90);
        });

        it('records 0 overtime when leaving before or on shift end', async () => {
            mockQueryOne
                .mockResolvedValueOnce({ check_in: '09:00:00' })
                .mockResolvedValueOnce({ shift_id: 'shift-1' })
                .mockResolvedValueOnce({ end_time: '17:00:00' });

            vi.setSystemTime(new Date(2026, 3, 10, 16, 0, 0)); // Leaving early

            const res = await POST(punchOutRequest());
            const body = await res?.json();

            expect(body.overtime_minutes).toBe(0);
        });

        it('returns 400 if no check-in exists for today', async () => {
            mockQueryOne.mockResolvedValueOnce(null); // No attendance record
            const res = await POST(punchOutRequest());
            expect(res?.status).toBe(400);
            expect((await res?.json()).error).toMatch(/تسجيل الحضور أولاً/);
        });
    });
});
