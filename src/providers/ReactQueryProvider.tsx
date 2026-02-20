'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useEffect, useState } from 'react';

export function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,
            // Cache kept in memory for 10 minutes
            cacheTime: 10 * 60 * 1000,
            // Don't refetch on window focus (reduce network calls)
            refetchOnWindowFocus: false,
            // Retry failed requests once
            retry: 1,
            // Don't retry on 404
            retryOnMount: false,
          },
        },
      })
  );

  useEffect(() => { setMounted(true); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Render devtools only after client mount to avoid hydration mismatch */}
      {mounted && process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
