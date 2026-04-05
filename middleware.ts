import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDefaultRouteForUserAgent } from "@/lib/default-route";

const redirectWithNoStore = (url: URL) => {
  const response = NextResponse.redirect(url);
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const isAdminPortal =
    hostname.startsWith("admin.") || hostname.startsWith("admin-dev.");
  const token = request.cookies.get("auth-token")?.value;
  const role = request.cookies.get("user-role")?.value;
  const { pathname } = request.nextUrl;
  const userAgent = request.headers.get("user-agent") ?? "";
  const defaultUserRoute = getDefaultRouteForUserAgent(userAgent);

  // ============ ADMIN PORTAL (admin.* / admin-dev.*) ============
  if (isAdminPortal) {
    // Block user-only pages on admin portal (no register, no forgot-password, no landing)
    const blockedOnAdmin = ["/signup", "/forgot-password"];
    if (
      blockedOnAdmin.some((p) => pathname.startsWith(p)) ||
      (pathname === "/" && !token)
    ) {
      return redirectWithNoStore(new URL("/admin/login", request.url));
    }

    // Root path with auth → redirect to dashboard
    if (pathname === "/") {
      if (token && role === "admin") {
        return redirectWithNoStore(new URL("/admin/users", request.url));
      }
      return redirectWithNoStore(new URL("/admin/login", request.url));
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
        return redirectWithNoStore(new URL("/admin/users", request.url));
      }
      return NextResponse.next();
    }

    // All other /admin/* routes require admin authentication
    if (!token || role !== "admin") {
      return redirectWithNoStore(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  // ============ USER PORTAL (all other hosts, e.g. localhost/dev.*) ============

  // Protect all /admin/* routes — only admin role can access
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (token && role === "admin") {
        return redirectWithNoStore(new URL("/admin/users", request.url));
      }
      return NextResponse.next();
    }

    if (!token) {
      return redirectWithNoStore(new URL("/login", request.url));
    }
    if (role !== "admin") {
      return redirectWithNoStore(new URL("/login", request.url));
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
    return redirectWithNoStore(new URL("/login", request.url));
  }

  // Logged in at root path → redirect by device type
  if (token && pathname === "/") {
    return redirectWithNoStore(new URL(defaultUserRoute, request.url));
  }

  // Logged in visiting public route → redirect to dashboard
  if (token && isPublicRoute) {
    return redirectWithNoStore(new URL(defaultUserRoute, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)"],
};
