import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Explicitly skip middleware for static files and manifest
  // This ensures these files are never blocked, even if matcher pattern fails
  // IMPORTANT: manifest.json route handler must be completely bypassed
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    /\.(svg|png|jpg|jpeg|gif|webp|json|ico|woff|woff2|ttf|eot|css|js)$/.test(pathname)
  ) {
    // For manifest.json, return immediately without any processing
    if (pathname === '/manifest.json') {
      return NextResponse.next({
        headers: {
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
    return NextResponse.next();
  }
  
  const res = NextResponse.next();
  
  try {
    // Only create Supabase client if env vars are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Skip Supabase setup if env vars are missing (e.g., during build)
      return res;
    }
    
    // Create Supabase client using @supabase/ssr (replaces deprecated auth-helpers-nextjs)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // In middleware, we can only write to res.cookies, not req.cookies
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Always refresh session (with error handling)
    try {
      await supabase.auth.getSession();
    } catch (sessionError) {
      // If session refresh fails, continue anyway (don't block the request)
      console.warn('Middleware: Session refresh failed:', sessionError);
    }
  } catch (error) {
    // If anything fails in middleware, continue anyway (don't crash)
    console.error('Middleware error:', error);
  }

  return res;
}

export const config = {
  matcher: [
    // Exclude static files, API routes that should be public, and manifest
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|ico|woff|woff2|ttf|eot)$).*)",
  ],
};

