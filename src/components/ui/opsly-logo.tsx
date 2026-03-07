"use client";

import React, { useEffect, useState } from 'react';

interface OpslyLogoProps {
  variant?: 'horizontal' | 'stacked' | 'icon-only';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  animated?: boolean; // New prop for animated entrance
  delay?: number; // Delay before animation starts (ms)
}

export const OpslyLogo: React.FC<OpslyLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showTagline = false,
  className = '',
  animated = false,
  delay = 0,
}) => {
  const [isVisible, setIsVisible] = useState(!animated);

  useEffect(() => {
    if (!animated) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [animated, delay]);

  // Size mappings for height
  const heightMap = {
    xs: 24,  // 50% of md (48 * 0.5)
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,  // 50% larger than lg (64 * 1.5)
  };

  // Width calculation based on variant
  const widthMap = {
    xs: variant === 'horizontal' ? 96 : 24,   // 50% of md width
    sm: variant === 'horizontal' ? 128 : 32,
    md: variant === 'horizontal' ? 192 : 48,
    lg: variant === 'horizontal' ? 256 : 64,
    xl: variant === 'horizontal' ? 384 : 96, // 50% larger than lg width
  };

  const height = heightMap[size];
  const width = widthMap[size];

  // Pick the right logo: mark-only for icon variant, full logo for horizontal/stacked
  const logoSrcDark = variant === 'icon-only'
    ? "/new_logos_opsly/opsly-mark.svg"
    : "/new_logos_opsly/opsly-logo-dark.svg";
  const logoSrcLight = variant === 'icon-only'
    ? "/new_logos_opsly/opsly-mark.svg"
    : "/new_logos_opsly/opsly-logo-light.svg";

  const logoElement = (
    <>
      <img
        src={logoSrcLight}
        alt="Opsly"
        width={width}
        height={height}
        className={`dark:hidden ${className}`}
        loading="eager"
        decoding="async"
      />
      <img
        src={logoSrcDark}
        alt="Opsly"
        width={width}
        height={height}
        className={`hidden dark:block ${className}`}
        loading="eager"
        decoding="async"
      />
    </>
  );

  // If not animated, return logo directly
  if (!animated) {
    return logoElement;
  }

  // Animated version with entrance effect (no halo)
  return (
    <div
      className={`relative inline-block ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {logoElement}
    </div>
  );
};
