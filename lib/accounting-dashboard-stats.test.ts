import { describe, it, expect, vi, afterEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("@/lib/db", () => ({
    query: (...a: unknown[]) => mockQuery(...a),
}));

import { getAccountingDashboardStats } from "./accounting-dashboard-stats";

describe("getAccountingDashboardStats", () => {
    afterEach(() => {
        mockQuery.mockReset();
    });

    it("returns numeric fields from first row", async () => {
        mockQuery.mockResolvedValueOnce([
            { cash: "100.5", bank: 200, receivables: 0, payables: "50.25" },
        ]);
        const s = await getAccountingDashboardStats("2026-04-30");
        expect(s.as_of_date).toBe("2026-04-30");
        expect(s.cash).toBe(100.5);
        expect(s.bank).toBe(200);
        expect(s.receivables).toBe(0);
        expect(s.payables).toBe(50.25);
    });

    it("retries without account deleted_at when first query throws", async () => {
        mockQuery.mockRejectedValueOnce(new Error("Unknown column 'deleted_at' in 'where clause'"));
        mockQuery.mockResolvedValueOnce([{ cash: 0, bank: 0, receivables: 0, payables: 0 }]);
        const s = await getAccountingDashboardStats();
        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(s.cash).toBe(0);
    });
});
