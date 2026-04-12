/**
 * Tests: Shifts API (GET/POST /api/hr/shifts)
 * Covers: Creation, defaults, validation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'shift-uuid-123');

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
    execute: (...args: any[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/hr/shifts/route';

describe('Shifts API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-001' },
        } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('creates shift successfully', async () => {
        mockExecute.mockResolvedValueOnce({});
        const res = await POST(new Request('http://localhost/api/hr/shifts', {
            method: 'POST',
            body: JSON.stringify({ name: 'Morning', start_time: '08:00', end_time: '16:00' })
        }));
        const body = await res?.json();

        expect(res?.status).toBe(201); // Shifts returns 201 on success
        expect(body.success).toBe(true);

        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO hr_shifts'),
            expect.arrayContaining(['Morning', '08:00', '16:00', 15]) // default 15 mins grace
        );
    });

    it('returns 400 if data missing', async () => {
        const res = await POST(new Request('http://localhost/api/hr/shifts', {
            method: 'POST',
            body: JSON.stringify({ name: 'Incomplete' })
        }));
        expect(res?.status).toBe(400);
    });

    it('GET returns shift list', async () => {
        const mockShifts = [{ name: 'S1' }];
        mockQuery.mockResolvedValueOnce(mockShifts);
        const res = await GET(new Request('http://localhost/api/hr/shifts'));
        const body = await res?.json();
        expect(res?.status).toBe(200);
        expect(body).toEqual(mockShifts);
    });
});
