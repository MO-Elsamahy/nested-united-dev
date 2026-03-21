import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { checkUserPermission } from "@/lib/permissions";

/**
 * Check if user has permission to access a page
 * Redirects to dashboard if no permission
 */
export async function requirePermission(
  pagePath: string,
  action: "view" | "edit"
): Promise<void> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check permission
  const hasPermission = await checkUserPermission(session.user.id, pagePath, action);

  if (!hasPermission) {
    redirect("/dashboard?error=no_permission");
  }
}

/**
 * Check if user has permission (returns boolean, doesn't redirect)
 */
export async function hasPermission(
  pagePath: string,
  action: "view" | "edit"
): Promise<boolean> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return false;
  }

  return await checkUserPermission(session.user.id, pagePath, action);
}
