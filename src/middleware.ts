import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookies = req.cookies;

  const hasAuthCookie =
    cookies.has("sb-access-token") ||
    cookies.has("sb-refresh-token") ||
    cookies.has("supabase-auth-token") ||
    cookies.has("supabase-session");

  // Redirect authenticated users away from recovery pages
  if ((pathname === "/forgot-password" || pathname === "/reset-password") && hasAuthCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Gate protected app routes only (do NOT gate the marketing homepage or other public pages)
  const protectedPrefixes = [
    "/app",
    "/dashboard",
    "/setup",
    "/tasks",
    "/logs",
    "/incidents",
    "/compliance",
    "/reports",
    "/settings",
    "/notifications",
    "/assets",
    "/account",
  ];

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  if (isProtected && !hasAuthCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/forgot-password",
    "/reset-password",
    "/app/:path*",
    "/dashboard/:path*",
    "/setup/:path*",
    "/tasks/:path*",
    "/logs/:path*",
    "/incidents/:path*",
    "/compliance/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/assets/:path*",
    "/account/:path*",
  ],
};