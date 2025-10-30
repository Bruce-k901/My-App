import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Always refresh session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Define route types
  const isPublicRoute = ["/", "/login", "/signup", "/forgot-password"].includes(
    pathname
  );
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // RULE: Dashboard requires session
  if (isDashboardRoute && !session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
     
    console.log("[Middleware] No session, redirecting to login");
    return NextResponse.redirect(redirectUrl);
  }

  // RULE: Login page redirects to dashboard if session exists
  if (pathname === "/login" && session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
     
    console.log("[Middleware] Has session, redirecting to dashboard");
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


