import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  try {
    // Create a Supabase client configured to use cookies
    const supabase = createMiddlewareClient({ req, res });
    
    // Refresh session if expired - this will automatically handle refresh tokens
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Handle refresh token errors
    if (error) {
      console.warn('Middleware auth error:', error.message);
      if (error.message.includes('Invalid Refresh Token') || 
          error.message.includes('Refresh Token Not Found')) {
        // Clear the invalid token and redirect to login
        const response = NextResponse.redirect(new URL("/login", req.url));
        response.cookies.delete("supabase-auth-token");
        return response;
      }
    }
    
    // Only protect the app routes
    if (req.nextUrl.pathname.startsWith("/app") && !session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // Fallback to token-based check if Supabase middleware fails
    const token = req.cookies.get("supabase-auth-token")?.value;
    
    if (req.nextUrl.pathname.startsWith("/app") && !token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    return NextResponse.next();
  }
}

// Apply only to /app routes
export const config = {
  matcher: ["/app/:path*"],
  runtime: 'nodejs',
};