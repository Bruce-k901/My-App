import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CODE_TO_MODULE } from "@/config/route-codes";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── URL Obfuscation: rewrite /app/:code/:path* → /dashboard/:module/:path* ──
  // This handles incoming requests to obfuscated URLs (shared links, bookmarks)
  if (pathname === "/app" || pathname.startsWith("/app/")) {
    const rest = pathname.slice("/app".length);
    if (!rest || rest === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/dashboard";
      const res = NextResponse.rewrite(url);
      await refreshSession(req, res);
      return res;
    }
    const segments = rest.split("/").filter(Boolean);
    const code = segments[0];
    const module = CODE_TO_MODULE[code];
    if (module) {
      const subPath = segments.slice(1).join("/");
      const url = req.nextUrl.clone();
      url.pathname = `/dashboard/${module}${subPath ? `/${subPath}` : ""}`;
      const res = NextResponse.rewrite(url);
      await refreshSession(req, res);
      return res;
    }
  }

  // ── Default: Supabase session refresh ──
  const res = NextResponse.next();
  await refreshSession(req, res);
  return res;
}

async function refreshSession(req: NextRequest, res: NextResponse) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      await supabase.auth.getSession();
    } catch (sessionError) {
      console.warn('Middleware: Session refresh failed:', sessionError);
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
  ],
};
