import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { checkUserPermission } from "@/lib/permissions";

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;
  const { pathname } = request.nextUrl;

  // Redirect home to portal or login
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/portal", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login
  if (pathname.startsWith("/login") && isAuthenticated) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // Protect all system routes from unauthenticated users
  const protectedPrefixes = ["/portal", "/dashboard", "/hr", "/crm", "/accounting", "/employee", "/settings"];
  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  if (isProtected) {
    if (!isAuthenticated || !token?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Portal and Employee portals are always allowed for authenticated users
    if (pathname.startsWith("/portal") || pathname.startsWith("/employee")) {
      return NextResponse.next();
    }

    // Dynamic database-driven RBAC checks for specific modules
    if (pathname.startsWith("/hr")) {
      const hasAccess = await checkUserPermission(token.id as string, "/hr", "view");
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
    }

    if (pathname.startsWith("/crm")) {
      const hasAccess = await checkUserPermission(token.id as string, "/crm", "view");
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
    }

    if (pathname.startsWith("/dashboard")) {
      const hasAccess = await checkUserPermission(token.id as string, "/dashboard", "view");
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
    }

    if (pathname.startsWith("/accounting")) {
      const hasAccess = await checkUserPermission(token.id as string, "/accounting", "view");
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
    }

    if (pathname.startsWith("/settings")) {
      const hasAccess = await checkUserPermission(token.id as string, "/settings", "view");
      if (!hasAccess) {
        return NextResponse.redirect(new URL("/portal", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
