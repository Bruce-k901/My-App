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
  const [isGlowing, setIsGlowing] = useState(false);

  useEffect(() => {
    if (!animated) return;

    // Start animation after delay
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Add glow effect after logo appears
      setTimeout(() => setIsGlowing(true), 600);
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

  const logoSrc = "/new_logos_opsly/opsly_new_hexstyle_logo.png";

  const logoElement = (
    <img
      src={logoSrc}
      alt="Opsly"
      width={width}
      height={height}
      className={className}
      loading="eager"
      decoding="async"
    />
  );

  // If not animated, return logo directly
  if (!animated) {
    return logoElement;
  }

  // Animated version with entrance effect
  return (
    <div 
      className={`relative inline-block ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        transition: 'opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 -z-10 rounded-lg blur-2xl transition-opacity duration-1000 ${
          isGlowing ? 'opacity-60' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(59, 130, 246, 0.4) 100%)',
          transform: 'scale(1.5)',
          left: '-50%',
          right: '-50%',
          top: '-50%',
          bottom: '-50%',
        }}
      />
      
      {/* Logo with pulse effect */}
      <div
        className={`transition-all duration-300 ${
          isGlowing ? 'drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]' : ''
        }`}
      >
        {logoElement}
      </div>
    </div>
  );
};
