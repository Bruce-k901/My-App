import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


