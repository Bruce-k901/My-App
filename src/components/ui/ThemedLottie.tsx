'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from '@/hooks/useTheme';
import { getThemedAnimation } from '@/lib/lottie-utils';
import type { ModuleKey } from '@/config/module-colors';

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
  { ssr: false }
);

interface ThemedLottieProps {
  /** URL path to the Lottie JSON (e.g. "/lottie/task-complete.json") */
  src: string;
  /** Module whose color to use. Defaults to 'checkly' (dashboard default). */
  module?: ModuleKey;
  width?: number;
  height?: number;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
}

export function ThemedLottie({
  src,
  module = 'checkly',
  width = 160,
  height = 160,
  loop = false,
  autoplay = true,
  className,
}: ThemedLottieProps) {
  const { resolvedTheme } = useTheme();
  const [rawData, setRawData] = useState<unknown>(null);

  // Fetch the raw Lottie JSON once
  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setRawData(json);
      })
      .catch((err) => console.error('Failed to load Lottie animation:', err));
    return () => { cancelled = true; };
  }, [src]);

  // Recolor whenever raw data, module, or theme changes
  const themedData = useMemo(() => {
    if (!rawData) return null;
    return getThemedAnimation(rawData, module, resolvedTheme);
  }, [rawData, module, resolvedTheme]);

  if (!themedData) return null;

  return (
    <Player
      autoplay={autoplay}
      loop={loop}
      src={themedData as object}
      style={{ width, height }}
      className={className}
    />
  );
}
