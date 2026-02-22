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

  const logoSrcLight = "/new_logos_opsly/opsly-logo-light.svg";
  const logoSrcDark = "/new_logos_opsly/opsly-logo-dark.svg";

  return (
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
}
