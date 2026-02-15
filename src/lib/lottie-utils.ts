import { getModuleHex, type ModuleKey } from '@/config/module-colors';

/**
 * Convert a hex color string to Lottie's [0-1, 0-1, 0-1] RGB format.
 * Accepts "#F1E194" or "F1E194".
 */
export function hexToLottieRgb(hex: string): number[] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/**
 * Deep-clone a Lottie JSON object and replace all color values with the
 * given RGB array. Handles both 3-component (RGB) and 4-component (RGBA)
 * color definitions, as well as keyframed colors.
 */
export function replaceAnimationColors(
  animationData: unknown,
  rgb: number[]
): unknown {
  const copy = JSON.parse(JSON.stringify(animationData));

  const traverse = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) return;

    // Static color: { c: { k: [r, g, b] } } or { c: { k: [r, g, b, a] } }
    if (obj.c && obj.c.k && Array.isArray(obj.c.k)) {
      if (obj.c.k.length === 3) {
        obj.c.k = [...rgb];
      } else if (obj.c.k.length === 4) {
        obj.c.k = [...rgb, obj.c.k[3]]; // preserve alpha
      }
    }

    for (const key of Object.keys(obj)) {
      traverse(obj[key]);
    }
  };

  traverse(copy);
  return copy;
}

/**
 * Get a recolored Lottie animation for a given module and theme.
 */
export function getThemedAnimation(
  animationData: unknown,
  module: ModuleKey,
  resolvedTheme: 'light' | 'dark'
): unknown {
  const hex = getModuleHex(module, resolvedTheme);
  const rgb = hexToLottieRgb(hex);
  return replaceAnimationColors(animationData, rgb);
}
