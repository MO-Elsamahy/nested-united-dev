import { describe, it, expect, beforeAll, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
    query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
}));

vi.mock('@/app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/accounting/reports/balance-sheet/route';

describe('Balance Sheet Report', () => {
    beforeAll(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'user-123' },
        } as { user: { id: string } });
    });

    it('should generate balanced balance sheet', async () => {
        // Mock balance sheet accounts
        mockQuery
            .mockResolvedValueOnce([
                {
                    id: 'acc-1',
                    code: '1000',
                    name: 'Cash',
                    type: 'asset_bank',
                    balance: 50000,
                },
                {
                    id: 'acc-2',
                    code: '1100',
                    name: 'Accounts Receivable',
                    type: 'asset_receivable',
                    balance: 30000,
                },
                {
                    id: 'acc-3',
                    code: '2000',
                    name: 'Accounts Payable',
                    type: 'liability_payable',
                    balance: 20000,
                },
                {
                    id: 'acc-4',
                    code: '3000',
                    name: 'Owner Equity',
                    type: 'equity',
                    balance: 50000,
                },
            ])
            // Mock retained earnings query
            .mockResolvedValueOnce([{ net_income: 10000 }]);

        const request = new Request(
            'http://localhost/api/accounting/reports/balance-sheet?as_of_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.as_of_date).toBe('2026-01-31');

        // Assets
        expect(data.assets.accounts).toHaveLength(2);
        expect(data.assets.total).toBe(80000); // 50000 + 30000

        // Liabilities
        expect(data.liabilities.accounts).toHaveLength(1);
        expect(data.liabilities.total).toBe(20000);

        // Equity
        expect(data.equity.accounts).toHaveLength(1);
        expect(data.equity.retained_earnings).toBe(10000);
        expect(data.equity.total).toBe(60000); // 50000 + 10000

        // Balance check: Assets (80000) = Liabilities (20000) + Equity (60000)
        expect(data.balance_check.is_balanced).toBe(true);
        expect(data.balance_check.difference).toBe(0);
    });

    it('should detect unbalanced balance sheet', async () => {
        // Mock with unbalanced data
        mockQuery
            .mockResolvedValueOnce([
                {
                    id: 'acc-1',
                    code: '1000',
                    name: 'Cash',
                    type: 'asset_bank',
                    balance: 100000,
                },
                {
                    id: 'acc-2',
                    code: '2000',
                    name: 'Accounts Payable',
                    type: 'liability_payable',
                    balance: 20000,
                },
            ])
            .mockResolvedValueOnce([{ net_income: 0 }]);

        const request = new Request(
            'http://localhost/api/accounting/reports/balance-sheet?as_of_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(data.assets.total).toBe(100000);
        expect(data.liabilities.total).toBe(20000);
        expect(data.equity.total).toBe(0);

        // Should be unbalanced: 100000 != 20000 + 0
        expect(data.balance_check.is_balanced).toBe(false);
        expect(data.balance_check.difference).toBe(80000);
    });

    it('should use current date if no as_of_date provided', async () => {
        mockQuery
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ net_income: 0 }]);

        const request = new Request(
            'http://localhost/api/accounting/reports/balance-sheet'
        );

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.as_of_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });

    it('should include retained earnings in equity calculation', async () => {
        mockQuery
            .mockResolvedValueOnce([
                {
                    id: 'acc-1',
                    code: '1000',
                    name: 'Cash',
                    type: 'asset_bank',
                    balance: 100000,
                },
                {
                    id: 'acc-2',
                    code: '2000',
                    name: 'Loan',
                    type: 'liability_long_term',
                    balance: 50000,
                },
                {
                    id: 'acc-3',
                    code: '3000',
                    name: 'Capital',
                    type: 'equity',
                    balance: 30000,
                },
            ])
            .mockResolvedValueOnce([{ net_income: 20000 }]); // Retained earnings

        const request = new Request(
            'http://localhost/api/accounting/reports/balance-sheet?as_of_date=2026-01-31'
        );

        const response = await GET(request);
        const data = await response.json();

        // Equity = Capital (30000) + Retained Earnings (20000)
        expect(data.equity.retained_earnings).toBe(20000);
        expect(data.equity.total).toBe(50000);

        // Balance check: 100000 = 50000 + 50000
        expect(data.balance_check.is_balanced).toBe(true);
    });
});
