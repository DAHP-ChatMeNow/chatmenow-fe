import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isAdminPortal = host.startsWith("admin.");
  const token = request.cookies.get("auth-token")?.value;
  const role = request.cookies.get("user-role")?.value;
  const { pathname } = request.nextUrl;

  // ============ ADMIN PORTAL (admin.localhost:3000) ============
  if (isAdminPortal) {
    // Block user-only pages on admin portal (no register, no forgot-password, no landing)
    const blockedOnAdmin = ["/signup", "/forgot-password"];
    if (
      blockedOnAdmin.some((p) => pathname.startsWith(p)) ||
      (pathname === "/" && !token)
    ) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Root path with auth → redirect to dashboard
    if (pathname === "/") {
      if (token && role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // If pathname doesn't start with /admin, rewrite with /admin prefix
    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }

    // Admin login page — allow unauthenticated, redirect if already logged in
    if (pathname === "/admin/login") {
      if (token && role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    // All other /admin/* routes require admin authentication
    if (!token || role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // ============ USER PORTAL (localhost:3000) ============

  // Protect all /admin/* routes — only admin role can access
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token && role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
      return NextResponse.next();
    }

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const publicRoutes = ["/login", "/signup", "/forgot-password"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  const protectedRoutes = [
    "/messages",
    "/contacts",
    "/blog",
    "/profile",
    "/notifications",
    "/settings",
  ];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // Not logged in → redirect to login
  if (!token && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in visiting public route → redirect to dashboard
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/messages", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)"],
};
