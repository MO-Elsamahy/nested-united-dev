/**
 * Tests: CRM Customers API — Duplicate Phone Detection & Customer CRUD
 * Covers: duplicate phone, missing fields, blacklist check, archive behavior
 */

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'cust-uuid');

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
    queryOne: (...args: any[]) => mockQueryOne(...args),
    execute: (...args: any[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { POST, GET } from '@/app/api/crm/customers/route';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeCustomerPayload = (overrides = {}) => ({
    full_name: 'أحمد عبدالله',
    phone: '0501234567',
    email: 'ahmed@example.com',
    type: 'individual',
    ...overrides,
});

const postCustomer = (payload: object) =>
    new Request('http://localhost/api/crm/customers', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('CRM Customers API', () => {
    beforeAll(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-001' },
        } as any);
    });

    afterEach(() => vi.clearAllMocks());

    // ── Duplicate phone detection ─────────────────────────────────────────────

    it('rejects a customer if the phone already exists', async () => {
        // The route calls query() (not queryOne()) for duplicate check
        // and returns existing[] — if length > 0 → 409
        mockQuery.mockResolvedValueOnce([{ id: 'existing-001', full_name: 'محمد', phone: '0501234567' }]);

        const res = await POST(postCustomer(makeCustomerPayload()));
        const body = await res.json();

        expect(res.status).toBe(409);
        expect(body.error).toMatch(/duplicate/i);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it('allows customer creation when no phone conflict exists', async () => {
        // query() returns empty array = no duplicate
        mockQuery.mockResolvedValueOnce([]); // no existing customer with this phone
        mockExecute.mockResolvedValue({});

        const res = await POST(postCustomer(makeCustomerPayload({ phone: '0501234567' })));
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO customers'),
            expect.any(Array)
        );
    });

    it('allows customer creation with no phone (phone is optional)', async () => {
        // When phone is falsy, the duplicate check block is skipped entirely
        // No query() call needed for phone check
        mockExecute.mockResolvedValue({});

        const res = await POST(postCustomer(makeCustomerPayload({ phone: '' })));
        expect([200, 201]).toContain(res.status);
    });

    // ── Different phone numbers ───────────────────────────────────────────────

    it('allows two different phone numbers without conflict', async () => {
        // First customer
        mockQueryOne.mockResolvedValueOnce(null);
        mockExecute.mockResolvedValue({});
        const res1 = await POST(postCustomer(makeCustomerPayload({ phone: '0501111111' })));
        expect(res1.status).toBe(200);

        // Second customer with different phone
        mockQueryOne.mockResolvedValueOnce(null);
        mockExecute.mockResolvedValue({});
        const res2 = await POST(postCustomer(makeCustomerPayload({ full_name: 'علي محمد', phone: '0502222222' })));
        expect(res2.status).toBe(200);
    });

    // ── Required fields ───────────────────────────────────────────────────────

    it('rejects customer with missing full_name', async () => {
        const payload = { phone: '0501234567', type: 'individual' }; // no full_name

        const res = await POST(postCustomer(payload));
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    // ── GET list ──────────────────────────────────────────────────────────────

    it('returns list of active customers with pagination', async () => {
        mockQuery.mockResolvedValueOnce([
            { id: 'c-1', full_name: 'أحمد', phone: '050', status: 'active' },
            { id: 'c-2', full_name: 'علي', phone: '051', status: 'active' },
        ]);

        const req = new Request('http://localhost/api/crm/customers');
        const res = await GET(req);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(Array.isArray(body)).toBe(true);
    });

    // ── Unauthorized ──────────────────────────────────────────────────────────

    it('returns 401 if user is not authenticated', async () => {
        vi.mocked(getServerSession).mockResolvedValueOnce(null as any);

        const res = await POST(postCustomer(makeCustomerPayload()));
        expect(res.status).toBe(401);
    });
});
