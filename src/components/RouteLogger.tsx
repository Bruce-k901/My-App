"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RouteLogger() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log(`[RouteLogger] Route changed to: ${pathname}`);
    
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

  return null;
}