import { describe, it, expect, beforeAll, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
}));

vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/accounting/reports/income-statement/route';

describe('Income Statement Report', () => {
    beforeAll(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-123' },
        } as any);
    });

    it('should generate income statement with revenue and expenses', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 'acc-1',
                code: '4000',
                name: 'Sales Revenue',
                type: 'income',
                amount: 50000,
            },
            {
                id: 'acc-2',
                code: '4100',
                name: 'Service Revenue',
                type: 'income',
                amount: 25000,
            },
            {
                id: 'acc-3',
                code: '6000',
                name: 'Salary Expense',
                type: 'expense',
                amount: 30000,
            },
            {
                id: 'acc-4',
                code: '6100',
                name: 'Rent Expense',
                type: 'expense',
                amount: 10000,
            },
        ]);

        const request = new Request(
            'http://localhost/api/accounting/reports/income-statement?from_date=2026-01-01&to_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.period).toEqual({
            from: '2026-01-01',
            to: '2026-01-31',
        });

        expect(data.revenue.accounts).toHaveLength(2);
        expect(data.revenue.total).toBe(75000); // 50000 + 25000

        expect(data.expenses.accounts).toHaveLength(2);
        expect(data.expenses.total).toBe(40000); // 30000 + 10000

        expect(data.net_income).toBe(35000); // 75000 - 40000
    });

    it('should return error if dates are missing', async () => {
        const request = new Request(
            'http://localhost/api/accounting/reports/income-statement'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Both from_date and to_date are required');
    });

    it('should handle period with no transactions', async () => {
        mockQuery.mockResolvedValueOnce([]);

        const request = new Request(
            'http://localhost/api/accounting/reports/income-statement?from_date=2026-01-01&to_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.revenue.accounts).toHaveLength(0);
        expect(data.revenue.total).toBe(0);
        expect(data.expenses.accounts).toHaveLength(0);
        expect(data.expenses.total).toBe(0);
        expect(data.net_income).toBe(0);
    });

    it('should calculate net loss correctly', async () => {
        mockQuery.mockResolvedValueOnce([
            {
                id: 'acc-1',
                code: '4000',
                name: 'Sales Revenue',
                type: 'income',
                amount: 10000,
            },
            {
                id: 'acc-2',
                code: '6000',
                name: 'Salary Expense',
                type: 'expense',
                amount: 30000,
            },
        ]);

        const request = new Request(
            'http://localhost/api/accounting/reports/income-statement?from_date=2026-01-01&to_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(data.revenue.total).toBe(10000);
        expect(data.expenses.total).toBe(30000);
        expect(data.net_income).toBe(-20000); // Loss
    });
});
