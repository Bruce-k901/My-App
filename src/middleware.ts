import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  try {
    // Check for existing auth cookies first
    const authCookies = req.cookies.getAll().filter(cookie => 
      cookie.name.includes('supabase') || cookie.name.includes('auth')
    );
    
    console.log(`[Middleware] Path: ${req.nextUrl.pathname}, Auth cookies found: ${authCookies.length}`);
    
    // Check for corrupted cookies and clear them if found
    let hasCorruptedCookies = false;
    authCookies.forEach(cookie => {
      try {
        // Try to parse base64 cookies to detect corruption
        if (cookie.value.startsWith('base64-')) {
          const decoded = atob(cookie.value.substring(7));
          JSON.parse(decoded);
        } else if (cookie.value.startsWith('eyJ')) {
          // This is likely a JWT token, try to parse it
          const parts = cookie.value.split('.');
          if (parts.length === 3) {
            // Try to decode the payload
            const payload = atob(parts[1]);
            JSON.parse(payload);
          }
        }
      } catch (e: any) {
        console.warn(`[Middleware] Corrupted cookie detected: ${cookie.name} - ${e?.message || 'Unknown error'}`);
        hasCorruptedCookies = true;
      }
    });
    
    // If corrupted cookies found, clear them and redirect to login
    if (hasCorruptedCookies && req.nextUrl.pathname.startsWith("/organization")) {
      console.log(`[Middleware] Clearing corrupted cookies and redirecting to login`);
      const response = NextResponse.redirect(new URL("/login", req.url));
      authCookies.forEach(cookie => {
        response.cookies.delete(cookie.name);
      });
      return response;
    }
    
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res });
    
    // Refresh session if expired - this will automatically handle refresh tokens
    let session, error;
    try {
      const result = await supabase.auth.getSession();
      session = result.data.session;
      error = result.error;
    } catch (sessionError: any) {
      console.warn(`[Middleware] Session retrieval error: ${sessionError?.message || 'Unknown error'}`);
      // If we can't get the session due to corrupted data, clear cookies and redirect
      if (req.nextUrl.pathname.startsWith("/organization")) {
        console.log(`[Middleware] Session error on protected route, clearing cookies`);
        const response = NextResponse.redirect(new URL("/login", req.url));
        authCookies.forEach(cookie => {
          response.cookies.delete(cookie.name);
        });
        return response;
      }
      return NextResponse.next();
    }
    
    console.log(`[Middleware] Session exists: ${!!session}, Error: ${error?.message || 'none'}`);
    
    // Handle refresh token errors
    if (error) {
      console.warn('Middleware auth error:', error.message);
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('Refresh Token Not Found')) {
        // Clear the invalid token and redirect to login
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("supabase-auth-token");
        // Also clear all supabase-related cookies
        authCookies.forEach(cookie => {
          response.cookies.delete(cookie.name);
        });
        return response;
      }
    }
    
    // Only protect organization routes - let dashboard handle its own auth
    if (req.nextUrl.pathname.startsWith("/organization") && !session) {
      console.log(`[Middleware] Redirecting to login - no session for protected route: ${req.nextUrl.pathname}`);
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    if (session) {
      console.log(`[Middleware] Allowing access to ${req.nextUrl.pathname} for user: ${session.user.email}`);
    }
    
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    
    // If this is an organization route and we have a middleware error, clear cookies and redirect
    if (req.nextUrl.pathname.startsWith("/organization")) {
      console.log(`[Middleware] Error on protected route, clearing cookies and redirecting`);
      const response = NextResponse.redirect(new URL("/login", req.url));
      const authCookies = req.cookies.getAll().filter(cookie => 
        cookie.name.includes('supabase') || cookie.name.includes('auth')
      );
      authCookies.forEach(cookie => {
        response.cookies.delete(cookie.name);
      });
      return response;
    }
    
    return NextResponse.next();
  }
}

// Apply only to organization routes - let dashboard handle its own auth
export const config = {
  matcher: ["/organization/:path*"],
  runtime: 'nodejs',
};