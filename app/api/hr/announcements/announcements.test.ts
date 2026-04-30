/**
 * Tests: Announcements API (GET/POST /api/hr/announcements)
 * Covers: Creation, pinning, defaults, ordering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'ann-uuid-123');

vi.mock('@/lib/db', () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/hr/announcements/route';

describe('Announcements API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-001' },
        } as { user: { id: string } });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('creates announcement with defaults', async () => {
        mockExecute.mockResolvedValueOnce({});
        const res = await POST(new Request('http://localhost/api/hr/announcements', {
            method: 'POST',
            body: JSON.stringify({ title: 'New Alert', content: 'Something happened' })
        }));
        const body = await res?.json();

        expect(res?.status).toBe(200);
        expect(body.success).toBe(true);

        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO hr_announcements'),
            expect.arrayContaining(['New Alert', 'Something happened', 'normal', 0]) // priority, is_pinned
        );
    });

    it('handles pinned announcements', async () => {
        mockExecute.mockResolvedValueOnce({});
        await POST(new Request('http://localhost/api/hr/announcements', {
            method: 'POST',
            body: JSON.stringify({ title: 'Pinned', content: 'Important', is_pinned: true })
        }));
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO hr_announcements'),
            expect.arrayContaining([1]) // is_pinned = 1
        );
    });

    it('GET returns announcements list', async () => {
        const mockAnn = [{ title: 'A1' }, { title: 'A2' }];
        mockQuery.mockResolvedValueOnce(mockAnn);
        const res = await GET(new Request('http://localhost/api/hr/announcements'));
        const body = await res?.json();
        expect(res?.status).toBe(200);
        expect(body).toEqual(mockAnn);
    });
});
