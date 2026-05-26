import { NextResponse, type NextRequest } from "next/server";

function hasProtectedSession(request: NextRequest) {
  return Boolean(request.cookies.get("final2_access_token")?.value && request.cookies.get("final2_role")?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("final2_role")?.value;

  // Student-only routes
  if (["/dashboard", "/history", "/profile", "/guidelines"].some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!hasProtectedSession(request) || role !== "student") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // SuperAdmin-only routes — teachers must NOT access this area
  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) {
    if (!hasProtectedSession(request) || role !== "superadmin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Teacher-only routes — superadmin must NOT access this area
  if (pathname === "/teacher" || pathname.startsWith("/teacher/")) {
    if (!hasProtectedSession(request) || role !== "teacher") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Analytics — accessible to both teacher and superadmin
  if (pathname === "/analytics" || pathname.startsWith("/analytics/")) {
    if (!hasProtectedSession(request) || !role || (role !== "teacher" && role !== "superadmin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/guidelines/:path*",
    "/teacher/:path*",
    "/superadmin/:path*",
    "/analytics/:path*",
  ],
};
