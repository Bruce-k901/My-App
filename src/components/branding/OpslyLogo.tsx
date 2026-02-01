import React from 'react';

interface OpslyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function OpslyLogo({ size = 'md', showText = true, className = '' }: OpslyLogoProps) {
  // Size mappings for height
  const heightMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  // Width calculation - logo is wider than tall (approximately 4:1 aspect ratio)
  const widthMap = {
    sm: 128,
    md: 192,
    lg: 256,
    xl: 384,
  };

  const height = heightMap[size];
  const width = widthMap[size];

  // Use SVG for better quality and scalability
  const logoSrc = "/new_logos_opsly/opsly_logo_v5_transparent.svg";

  return (
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
}
