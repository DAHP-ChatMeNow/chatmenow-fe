import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const role = request.cookies.get("user-role")?.value;
  const { pathname } = request.nextUrl;

  const publicRoutes = ["/login", "/signup"];
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

  const isAdminRoute = pathname.startsWith("/admin");

  // Not logged in -> redirect to login
  if (!token && (isProtectedRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Logged in but not admin -> redirect away from admin
  if (token && isAdminRoute && role !== "admin") {
    return NextResponse.redirect(new URL("/messages", request.url));
  }

  // Logged in visiting public route -> redirect
  if (token && isPublicRoute) {
    const dest = role === "admin" ? "/admin" : "/messages";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)"],
};
