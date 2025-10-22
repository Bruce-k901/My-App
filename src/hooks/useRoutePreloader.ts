import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

interface PreloadOptions {
  priority?: 'high' | 'low';
  delay?: number;
}

export function useRoutePreloader() {
  const router = useRouter();
  const preloadedRoutes = useRef(new Set<string>());
  const preloadTimeouts = useRef(new Map<string, NodeJS.Timeout>());

  const preloadRoute = useCallback((href: string, options: PreloadOptions = {}) => {
    const { priority: _priority = 'low', delay = 0 } = options;
    
    // Skip if already preloaded
    if (preloadedRoutes.current.has(href)) {
      return;
    }

    // Clear existing timeout for this route
    const existingTimeout = preloadTimeouts.current.get(href);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const preload = () => {
      try {
        router.prefetch(href);
        preloadedRoutes.current.add(href);
        preloadTimeouts.current.delete(href);
      } catch (error) {
        console.warn(`Failed to preload route: ${href}`, error);
      }
    };

    if (delay > 0) {
      const timeout = setTimeout(preload, delay);
      preloadTimeouts.current.set(href, timeout);
    } else {
      preload();
    }
  }, [router]);

  const preloadOnHover = useCallback((href: string) => {
    return {
      onMouseEnter: () => preloadRoute(href, { priority: 'high', delay: 100 }),
      onTouchStart: () => preloadRoute(href, { priority: 'high', delay: 50 }),
    };
  }, [preloadRoute]);

  const preloadDashboardRoutes = useCallback(() => {
    // Preload common dashboard routes with staggered delays
    const routes = [
      { path: '/dashboard/tasks', delay: 100 },
      { path: '/dashboard/assets', delay: 200 },
      { path: '/dashboard/organization', delay: 300 },
      { path: '/dashboard/ppm', delay: 400 },
      { path: '/dashboard/reports', delay: 500 },
      { path: '/dashboard/settings', delay: 600 },
    ];

    routes.forEach(({ path, delay }) => {
      preloadRoute(path, { priority: 'low', delay });
    });
  }, [preloadRoute]);

  // Cleanup function to clear timeouts
  useEffect(() => {
    return () => {
      const timeouts = preloadTimeouts.current;
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  return {
    preloadRoute,
    preloadOnHover,
    preloadDashboardRoutes,
  };
}