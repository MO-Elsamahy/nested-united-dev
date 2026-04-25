/**
 * Tests: Employee CRUD (GET/POST /api/hr/employees and GET/PUT/DELETE /api/hr/employees/[id])
 * Covers: list, filtering, creation, validation, defaults, detail view, soft update, soft delete.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockGenerateUUID = vi.fn(() => 'emp-uuid-123');

vi.mock('@/lib/db', () => ({
    query: (...args: any[]) => mockQuery(...args),
    queryOne: (...args: any[]) => mockQueryOne(...args),
    execute: (...args: any[]) => mockExecute(...args),
    generateUUID: () => mockGenerateUUID(),
}));

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/hr/employees/route';
import { GET as GET_DETAIL, PUT, DELETE } from '@/app/api/hr/employees/[id]/route';

describe('Employees CRUD API', () => {
    beforeEach(() => {
        vi.mocked(getServerSession).mockResolvedValue({
            user: { id: 'admin-001' },
        } as any);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    // ── GET /api/hr/employees (Listing & Filtering) ──────────────────────────
    describe('GET /api/hr/employees', () => {
        it('returns employee list for authorized users', async () => {
            const mockEmployees = [
                { id: '1', full_name: 'Ahmed Ali' },
                { id: '2', full_name: 'Sara Ahmed' }
            ];
            mockQuery.mockResolvedValue(mockEmployees);

            const res = await GET(new Request('http://localhost/api/hr/employees'));
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body).toEqual(mockEmployees);
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT e.*'), expect.any(Array));
        });

        it('filters by status', async () => {
            mockQuery.mockResolvedValue([]);
            await GET(new Request('http://localhost/api/hr/employees?status=active'));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND e.status = ?'), ['active']);
        });

        it('filters by department', async () => {
            mockQuery.mockResolvedValue([]);
            await GET(new Request('http://localhost/api/hr/employees?department=HR'));
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('AND e.department = ?'), ['HR']);
        });

        it('filters by search term', async () => {
            mockQuery.mockResolvedValue([]);
            await GET(new Request('http://localhost/api/hr/employees?search=Ahmed'));
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('AND (e.full_name LIKE ? OR e.employee_number LIKE ? OR e.national_id LIKE ?)'),
                ['%Ahmed%', '%Ahmed%', '%Ahmed%']
            );
        });
    });

    // ── POST /api/hr/employees (Creation) ────────────────────────────────────
    describe('POST /api/hr/employees', () => {
        const validEmployee = {
            full_name: 'New Employee',
            employee_number: 'EMP001',
            basic_salary: 5000
        };

        it('returns 400 if full_name is missing', async () => {
            const res = await POST(new Request('http://localhost/api/hr/employees', {
                method: 'POST',
                body: JSON.stringify({ employee_number: 'EMP001' })
            }));
            const body = await res.json();
            expect(res.status).toBe(400);
            expect(body.error).toMatch(/اسم الموظف مطلوب/);
        });

        it('returns 400 if employee_number already exists', async () => {
            mockQueryOne.mockResolvedValue({ id: 'existing-id' });
            const res = await POST(new Request('http://localhost/api/hr/employees', {
                method: 'POST',
                body: JSON.stringify(validEmployee)
            }));
            const body = await res.json();
            expect(res.status).toBe(400);
            expect(body.error).toMatch(/رقم الموظف مستخدم مسبقاً/);
        });

        it('creates employee successfully with defaults', async () => {
            mockQueryOne.mockResolvedValue(null); // No existing employee
            mockExecute.mockResolvedValue({});

            const res = await POST(new Request('http://localhost/api/hr/employees', {
                method: 'POST',
                body: JSON.stringify({ full_name: 'Default Emp' })
            }));
            const body = await res.json();

            expect(res.status).toBe(201);
            expect(body.success).toBe(true);
            expect(body.id).toBe('emp-uuid-123');

            // Verify defaults in execute call
            const executeArgs = mockExecute.mock.calls[0][1];
            expect(executeArgs).toContain('full_time'); // default contract
            expect(executeArgs).toContain(21); // default annual leave
            expect(executeArgs).toContain(30); // default sick leave
        });
    });

    // ── Employees [id] Detail/Update/Delete ──────────────────────────────────
    describe('Employees [id] routes', () => {
        const empId = '123';
        // Fresh promise for each test
        const getParams = () => Promise.resolve({ id: empId });

        it('GET returns 404 if not found', async () => {
            mockQueryOne.mockResolvedValue(null);
            const res = await GET_DETAIL(new Request('http://localhost/api/hr/employees/123'), { params: getParams() });
            expect(res.status).toBe(404);
        });

        it('GET returns employee if found', async () => {
            const mockEmp = { id: empId, full_name: 'Found' };
            mockQueryOne.mockResolvedValue(mockEmp);
            const res = await GET_DETAIL(new Request('http://localhost/api/hr/employees/123'), { params: getParams() });
            const body = await res.json();
            expect(res.status).toBe(200);
            expect(body).toEqual(mockEmp);
            expect(mockQueryOne).toHaveBeenCalledWith(expect.stringContaining('WHERE e.id = ?'), [empId]);
        });

        it('PUT updates fields successfully', async () => {
            mockQueryOne.mockResolvedValue({ id: empId }); // Exists
            mockExecute.mockResolvedValue({});
            
            const res = await PUT(new Request('http://localhost/api/hr/employees/123', {
                method: 'PUT',
                body: JSON.stringify({ full_name: 'Updated Name', status: 'active' })
            }), { params: getParams() });

            expect(res.status).toBe(200);
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE hr_employees SET'),
                expect.arrayContaining(['Updated Name', 'active', empId])
            );
        });

        it('DELETE performs a soft delete (terminated status)', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: empId });
            mockExecute.mockResolvedValue({});
            const res = await DELETE(new Request('http://localhost/api/hr/employees/123', {
                method: 'DELETE'
            }), { params: getParams() });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.mode).toBe('terminated');
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining("UPDATE hr_employees SET status = 'terminated'"),
                [empId]
            );
        });

        it('DELETE with permanent=1 returns 403 for non-super_admin', async () => {
            mockQueryOne.mockResolvedValueOnce({ id: empId });
            vi.mocked(getServerSession).mockResolvedValueOnce({
                user: { id: 'admin-001', role: 'hr_manager' },
            } as any);
            const res = await DELETE(
                new Request('http://localhost/api/hr/employees/123?permanent=1', { method: 'DELETE' }),
                { params: getParams() }
            );
            expect(res.status).toBe(403);
            expect(mockExecute).not.toHaveBeenCalled();
        });

        it('DELETE with permanent=1 deletes row when super_admin and no blocking rows', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({
                user: { id: 'admin-001', role: 'super_admin' },
            } as any);
            mockQueryOne
                .mockResolvedValueOnce({ id: empId })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 });
            mockExecute.mockResolvedValue({});

            const res = await DELETE(
                new Request('http://localhost/api/hr/employees/123?permanent=1', { method: 'DELETE' }),
                { params: getParams() }
            );
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.mode).toBe('deleted');
            expect(mockExecute).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM hr_employees'),
                [empId]
            );
        });

        it('DELETE with permanent=1 returns 409 when payroll lines exist', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce({
                user: { id: 'admin-001', role: 'super_admin' },
            } as any);
            mockQueryOne
                .mockResolvedValueOnce({ id: empId })
                .mockResolvedValueOnce({ c: 3 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 })
                .mockResolvedValueOnce({ c: 0 });
            const res = await DELETE(
                new Request('http://localhost/api/hr/employees/123?permanent=1', { method: 'DELETE' }),
                { params: getParams() }
            );
            expect(res.status).toBe(409);
            expect(mockExecute).not.toHaveBeenCalled();
        });
    });
});
