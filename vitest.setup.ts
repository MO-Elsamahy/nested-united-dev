import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/lib/permissions', () => ({
    checkUserPermission: vi.fn(() => Promise.resolve(true)),
    hasSystemAccess: vi.fn(() => Promise.resolve(true)),
    clearPermissionCacheForUser: vi.fn(),
    logActivityInServer: vi.fn(),
}));
