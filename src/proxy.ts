import { NextResponse } from "next/server";

function parseSupabaseCookie(value: string) {
  try {
    // Supabase sometimes prefixes "base64-" before the token
    const clean = value.startsWith("base64-") ? value.slice(7) : value;
    const decoded = atob(clean);
    return JSON.parse(decoded);
  } catch (e) {
    console.warn("Failed to parse Supabase cookie:", e);
    return null;
  }
}

export async function proxy(req: any) {
  const url = new URL(req.url);
  
  // Allow public routes to pass through without authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/test-session'];
  if (publicRoutes.some(route => url.pathname.startsWith(route))) {
    console.log("[Proxy] Public route, allowing:", url.pathname);
    return NextResponse.next();
  }

  const cookie = req.cookies.get("sb-xijoybubtrgbrhquqwrx-auth-token");
  let session = null;

  console.log("[Proxy] Checking auth for:", req.url);
  console.log("[Proxy] Cookie exists:", !!cookie?.value);

  if (cookie?.value) {
    session = parseSupabaseCookie(cookie.value);
    console.log("[Proxy] Parsed session:", !!session, session?.user?.email);
  }

  if (!session || !session.user) {
    console.log("[Proxy] No valid session, redirecting to login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  console.log("[Proxy] Valid session found, allowing request");
  // session is valid — let the request through
  return NextResponse.next();
}

// Apply to protected routes only
export const config = {
  matcher: ["/organization/:path*", "/dashboard/:path*"],
};
