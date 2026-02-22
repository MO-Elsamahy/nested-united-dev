import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // Redirect home to dashboard or login
  if (request.nextUrl.pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (request.nextUrl.pathname.startsWith("/login") && isAuthenticated) {
    if (token?.role === "maintenance_worker") {
      return NextResponse.redirect(new URL("/employee", request.url));
    }
    return NextResponse.redirect(new URL("/hr", request.url));
  }

  // RBAC: Protect HR Admin Routes
  // Only allow Admin/SuperAdmin/HR to access /hr
  if (request.nextUrl.pathname.startsWith("/hr")) {
    const allowedRoles = ["super_admin", "admin", "hr_manager"];
    const userRole = token?.role as string;

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/employee", request.url));
    }
  }

  // RBAC: Protect CRM Routes
  // Allow super_admin, admin, hr_manager (maybe sales later)
  if (request.nextUrl.pathname.startsWith("/crm")) {
    // For now, let's restrict to admins. We can add a 'sales' role later.
    const allowedRoles = ["super_admin", "admin", "hr_manager"];
    const userRole = token?.role as string;

    if (!allowedRoles.includes(userRole)) {
      // Redirect unauthorized users to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // RBAC: Protect Employee Portal
  // (Optional: restrict admins from employee view? usually not needed, but good for clarity)
  // For now, key requirement is blocking employees from /hr.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
