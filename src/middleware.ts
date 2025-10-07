import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Only guard the password recovery routes
  if (pathname === "/forgot-password" || pathname === "/reset-password") {
    const cookies = req.cookies;
    // Heuristic: if any Supabase auth cookies are present, treat as authenticated
    const hasAuthCookie =
      cookies.has("sb-access-token") ||
      cookies.has("sb-refresh-token") ||
      cookies.has("supabase-auth-token") ||
      cookies.has("supabase-session");

    if (hasAuthCookie) {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/forgot-password", "/reset-password"],
};