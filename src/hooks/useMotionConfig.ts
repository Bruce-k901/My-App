'use client';

import { useUserPreferences } from '@/context/UserPreferencesContext';

/**
 * Returns motion-safe animation config for framer-motion components.
 * When reduce_animations is enabled, returns instant transitions.
 */
export function useMotionConfig() {
  const { preferences } = useUserPreferences();
  const shouldAnimate = !(preferences.reduce_animations ?? false);

  return {
    shouldAnimate,
    // Use these as spread props on framer-motion components
    transition: shouldAnimate
      ? undefined // let component use its own defaults
      : { duration: 0 },
    initial: shouldAnimate ? undefined : false,
  };
}
