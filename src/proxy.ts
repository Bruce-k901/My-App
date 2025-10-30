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

  // Try to detect Supabase auth cookie dynamically (sb-<ref>-auth-token)
  const allCookies = req.cookies?.getAll?.() || [];
  const authCookie = allCookies.find((c: any) => c?.name?.startsWith('sb-') && c?.name?.endsWith('-auth-token'));
  let session = null;

  console.log("[Proxy] Checking auth for:", req.url);
  console.log("[Proxy] Cookie exists:", !!authCookie?.value);

  if (authCookie?.value) {
    session = parseSupabaseCookie(authCookie.value);
    console.log("[Proxy] Parsed session:", !!session, session?.user?.email);
  }

  // If we cannot determine a valid session at the edge, allow the request and let the client guard handle redirects.
  if (!session || !session.user) {
    console.log("[Proxy] No valid session detected at edge - allowing, client guard will redirect if needed");
    return NextResponse.next();
  }

  console.log("[Proxy] Valid session found, allowing request");
  // session is valid — let the request through
  return NextResponse.next();
}

// Apply to protected routes only
export const config = {
  matcher: ["/organization/:path*", "/dashboard/:path*"],
};
