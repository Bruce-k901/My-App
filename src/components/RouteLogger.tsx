"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RouteLogger() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log(`[RouteLogger] Route changed to: ${pathname}`);
    // If user is already signed in, never allow staying on /login
    (async () => {
      if (pathname === "/login") {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          router.replace("/dashboard");
          return;
        }
      }
    })();
    
    // Log any navigation events
    const originalPush = router.push;
    const originalReplace = router.replace;
    
    router.push = (...args) => {
      console.log(`[RouteLogger] router.push called with:`, args);
      return originalPush.apply(router, args);
    };
    
    router.replace = (...args) => {
      console.log(`[RouteLogger] router.replace called with:`, args);
      return originalReplace.apply(router, args);
    };
    
    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [pathname, router]);

  useEffect(() => {
    // On auth state change, if signed in and currently on /login, move to /dashboard
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && window.location.pathname === "/login") {
        router.replace("/dashboard");
      }
    });
    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  return null;
}