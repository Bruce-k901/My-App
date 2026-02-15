'use client';

import { useEffect, useState } from 'react';
import { useSpring, useMotionValue, useReducedMotion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  formatFn?: (n: number) => string;
}

/**
 * AnimatedCounter — counts up from 0 (or previous value) to target value.
 * Respects prefers-reduced-motion. Colour is controlled by parent via className.
 */
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  className = '',
  formatFn,
}: AnimatedCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.5,
  });
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value);
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const unsubscribe = spring.on('change', (latest) => {
      setDisplay(Math.round(latest));
    });
    return unsubscribe;
  }, [spring, prefersReducedMotion]);

  const formatted = formatFn ? formatFn(display) : display.toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export default AnimatedCounter;
