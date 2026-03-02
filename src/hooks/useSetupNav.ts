'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Hook for propagating the ?from=setup query param through navigation.
 * Used by the Getting Started hub and any config page that links deeper.
 */
export function useSetupNav() {
  const searchParams = useSearchParams();
  const isFromSetup = searchParams.get('from') === 'setup';

  /** Append ?from=setup to a path if we're currently in a setup flow */
  function setupHref(href: string): string {
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}from=setup`;
  }

  return { isFromSetup, setupHref };
}
