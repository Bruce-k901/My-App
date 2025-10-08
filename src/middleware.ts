import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("supabase-auth-token")?.value;

  // Only protect the app routes
  if (req.nextUrl.pathname.startsWith("/app") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Let everything else load normally
  return NextResponse.next();
}

// Apply only to /app routes
export const config = {
  matcher: ["/app/:path*"],
};