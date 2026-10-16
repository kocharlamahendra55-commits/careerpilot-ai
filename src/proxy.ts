import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

const COOKIE_NAME = "session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifyToken(token) : null;

  // Protect /dashboard/* → students only
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (session.role === "RECRUITER") {
      return NextResponse.redirect(new URL("/recruiter/dashboard", request.url));
    }
  }

  // Protect /recruiter/* → recruiters only
  if (pathname.startsWith("/recruiter")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (session.role === "STUDENT") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Protect /admin/* → admins only
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    if (session.role !== "ADMIN") {
      const target = session.role === "RECRUITER" ? "/recruiter/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (pathname.startsWith("/auth") && session) {
    if (session.role === "RECRUITER") {
      return NextResponse.redirect(new URL("/recruiter/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/recruiter/:path*", "/auth/:path*", "/admin/:path*"],
};
