import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { queryOne } from "./db";

export type UserRole = "super_admin" | "admin" | "maintenance_worker";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  is_active: boolean | number;
  created_at: string;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const userData = await queryOne<AppUser>(
    "SELECT * FROM users WHERE id = ?",
    [session.user.id]
  );

  if (!userData) {
    return null;
  }

  // MySQL returns is_active as 0 or 1
  const isActive = userData.is_active === 1 || userData.is_active === true;
  if (!isActive) {
    return null;
  }

  return {
    ...userData,
    is_active: isActive,
  };
}

export async function requireAuth(): Promise<AppUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function requireSuperAdmin(): Promise<AppUser> {
  const user = await requireAuth();

  if (user.role !== "super_admin") {
    throw new Error("Forbidden: Super admin access required");
  }

  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAuth();

  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export function isSuperAdmin(user: AppUser | null): boolean {
  return user?.role === "super_admin";
}

export function isAdmin(user: AppUser | null): boolean {
  return user?.role === "admin" || user?.role === "super_admin";
}

export function isMaintenanceWorker(user: AppUser | null): boolean {
  return user?.role === "maintenance_worker";
}

export function canManageUnits(user: AppUser | null): boolean {
  return user?.role === "admin" || user?.role === "super_admin";
}

export function canManageMaintenance(user: AppUser | null): boolean {
  // All roles can interact with maintenance (workers can accept/update their tickets)
  return user !== null;
}
