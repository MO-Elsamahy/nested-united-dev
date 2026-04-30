/**
 * Tests: CRM Deals API — POST body mapping, PUT validation
 */

import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock("@/lib/db", () => ({
    query: (...args: unknown[]) => mockQuery(...args),
    queryOne: (...args: unknown[]) => mockQueryOne(...args),
    execute: (...args: unknown[]) => mockExecute(...args),
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/app/api/auth/[...nextauth]/route", () => ({ authOptions: {} }));

vi.mock("uuid", () => ({ v4: () => "deal-test-uuid" }));

import { getServerSession } from "next-auth";
import { POST, PUT } from "@/app/api/crm/deals/route";

beforeAll(() => {
    vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-001" },
    } as { user: { id: string } });
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("CRM Deals API POST", () => {
    it("maps notes to description and passes priority and expected_close_date", async () => {
        mockExecute.mockResolvedValue({});

        const req = new Request("http://localhost/api/crm/deals", {
            method: "POST",
            body: JSON.stringify({
                customer_id: "c1",
                title: "Deal A",
                notes: "Follow up next week",
                stage: "proposal",
                value: "1500.5",
                priority: "high",
                expected_close_date: "2026-05-01",
            }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        expect(mockExecute).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO crm_deals"),
            expect.arrayContaining([
                "deal-test-uuid",
                "c1",
                "Deal A",
                "Follow up next week",
                "proposal",
                1500.5,
                "high",
                "2026-05-01",
            ])
        );
    });

    it("prefers explicit description over notes", async () => {
        mockExecute.mockResolvedValue({});

        const req = new Request("http://localhost/api/crm/deals", {
            method: "POST",
            body: JSON.stringify({
                customer_id: "c1",
                title: "Deal B",
                description: "From description field",
                notes: "Ignored",
            }),
        });

        await POST(req);

        const args = mockExecute.mock.calls[0][1] as unknown[];
        expect(args[3]).toBe("From description field");
    });
});

describe("CRM Deals API PUT", () => {
    it("returns 400 when id is valid but no stage or status provided", async () => {
        mockQueryOne.mockResolvedValueOnce({
            stage: "new",
            status: "open",
            customer_id: "c1",
        });

        const req = new Request("http://localhost/api/crm/deals", {
            method: "PUT",
            body: JSON.stringify({ id: "d1" }),
        });

        const res = await PUT(req);
        expect(res.status).toBe(400);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it("returns 404 when deal id does not exist", async () => {
        mockQueryOne.mockResolvedValueOnce(null);

        const req = new Request("http://localhost/api/crm/deals", {
            method: "PUT",
            body: JSON.stringify({ id: "missing", stage: "won" }),
        });

        const res = await PUT(req);
        expect(res.status).toBe(404);
        expect(mockExecute).not.toHaveBeenCalled();
    });

    it("updates stage when provided", async () => {
        mockQueryOne.mockResolvedValueOnce({
            stage: "new",
            status: "open",
            customer_id: "c1",
        });
        mockExecute.mockResolvedValue({});

        const req = new Request("http://localhost/api/crm/deals", {
            method: "PUT",
            body: JSON.stringify({ id: "d1", stage: "contacting" }),
        });

        const res = await PUT(req);
        expect(res.status).toBe(200);
        expect(mockExecute).toHaveBeenCalled();
    });
});
