import { NextResponse, type NextRequest } from "next/server";

function hasProtectedSession(request: NextRequest) {
  return Boolean(request.cookies.get("final2_access_token")?.value && request.cookies.get("final2_role")?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = request.cookies.get("final2_role")?.value;

  if (["/dashboard", "/history", "/profile", "/guidelines"].some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!hasProtectedSession(request) || role !== "student") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (["/teacher", "/superadmin", "/analytics"].some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    if (!hasProtectedSession(request) || !role || (role !== "teacher" && role !== "superadmin")) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/history/:path*", "/profile/:path*", "/guidelines/:path*", "/teacher/:path*", "/superadmin/:path*", "/analytics/:path*"]
};
