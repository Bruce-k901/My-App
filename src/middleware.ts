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

  // Temporarily allow dashboard without edge session to avoid redirect ping-pong
  // Client-side guard will handle redirect if needed

  // Allow login page to render even if a session exists to avoid redirect loops

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


