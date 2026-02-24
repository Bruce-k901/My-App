'use client';

import { useEffect, useState } from 'react';
import { useSpring, useMotionValue } from 'framer-motion';
import { useUserPreferences } from '@/context/UserPreferencesContext';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (n: number) => string;
}

/**
 * AnimatedCounter — counts up from 0 (or previous value) to target value.
 * Respects app reduce_animations preference. Colour is controlled by parent via className.
 */
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className = '',
  formatFn,
}: AnimatedCounterProps) {
  const { preferences } = useUserPreferences();
  const skipAnimation = preferences.reduce_animations ?? false;
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.5,
  });
  const [display, setDisplay] = useState(skipAnimation ? value : 0);

  useEffect(() => {
    if (skipAnimation) {
      setDisplay(value);
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, skipAnimation]);

  useEffect(() => {
    if (skipAnimation) return;
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(Math.round(latest));
    });
    return unsubscribe;
  }, [spring, skipAnimation]);

  const formatted = formatFn ? formatFn(display) : display.toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default AnimatedCounter;
