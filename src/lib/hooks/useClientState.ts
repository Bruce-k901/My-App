/**
 * Hook to ensure state is only initialized on the client side
 * Prevents hydration mismatches in Next.js
 */

import { useState, useEffect } from 'react';

/**
 * Hook that ensures state initialization only happens on the client
 * Use this when your initial state depends on Date.now(), Math.random(), or other browser APIs
 * 
 * @param initialValueFactory - Function that returns the initial value (only called on client)
 * @param serverValue - Value to use during SSR (defaults to null)
 * 
 * @example
 * const [items, setItems] = useClientState(
 *   () => [{ id: Date.now(), name: 'Item' }],
 *   []
 * );
 */
export function useClientState<T>(
  initialValueFactory: () => T,
  serverValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(serverValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only initialize with the factory value after hydration
    setIsHydrated(true);
    setState(initialValueFactory());
  }, []); // Empty deps - only run once after mount

  return [state, setState];
}

/**
 * Hook to check if component has hydrated (mounted on client)
 * Useful for conditional rendering that should only happen on client
 */
export function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}

