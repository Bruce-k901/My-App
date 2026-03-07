/**
 * Module colour hex values for inline styles.
 *
 * The canonical colour definitions live as CSS variables in globals.css.
 * Tailwind classes (bg-checkly, text-planly, border-stockly/20 …) are
 * wired to those variables via tailwind.config.js and should be preferred.
 *
 * Each module has a colour triplet: light (dark theme) + mid (depth) + dark (light theme).
 * Use MODULE_HEX only where an actual hex string is required — for example
 * in `style={{ color: … }}` or when computing rgba() in JS.
 */

export type ModuleKey = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';

/** Brand CTA colour — Crimson Smoke mid */
export const BRAND_CTA = '#8A2B2B';
export const BRAND_CTA_RGB = '138, 43, 43';

export const MODULE_HEX: Record<ModuleKey, { light: string; mid: string; dark: string }> = {
  checkly:  { light: '#FDF7EF', mid: '#D4C6AD', dark: '#7E8052' },   // Champagne Olive
  stockly:  { light: '#CDEED6', mid: '#4FBDBA', dark: '#1B4242' },   // Velvet Teal
  teamly:   { light: '#F2C9C9', mid: '#8A2B2B', dark: '#3B0A0A' },   // Crimson Smoke
  planly:   { light: '#F0F4ED', mid: '#BFD8C1', dark: '#4E7E5D' },   // Jade Silk
  assetly:  { light: '#A7FFEB', mid: '#14655B', dark: '#002B36' },   // Royal Emerald
  msgly:    { light: '#A7A8B2', mid: '#5A5C6A', dark: '#1A1C22' },   // Platinum Dusk
} as const;

export const SIDEBAR_TINTS: Record<ModuleKey, { dark: string; light: string }> = {
  checkly: { dark: '#0f0f0c', light: '#fcfaf5' },
  stockly: { dark: '#0a1010', light: '#f3fbf5' },
  teamly:  { dark: '#100b0b', light: '#faf3f3' },
  planly:  { dark: '#0d110e', light: '#f6f9f5' },
  assetly: { dark: '#0a0e0e', light: '#f0fcf9' },
  msgly:   { dark: '#0d0d0f', light: '#f4f4f6' },
} as const;

export const MODULE_NAMES: Record<ModuleKey, string> = {
  checkly: 'Checkly',
  stockly: 'Stockly',
  teamly:  'Teamly',
  planly:  'Planly',
  assetly: 'Assetly',
  msgly:   'Msgly',
} as const;

/**
 * Helper: returns the correct hex for the current theme.
 * Dark theme → light colour (pops against dark bg)
 * Light theme → dark colour (reads well on light bg)
 */
export function getModuleHex(module: ModuleKey, resolvedTheme: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' ? MODULE_HEX[module].light : MODULE_HEX[module].dark;
}

/**
 * Helper: returns the mid colour (theme-independent, used for depth/borders/highlights).
 */
export function getModuleMidHex(module: ModuleKey): string {
  return MODULE_HEX[module].mid;
}

/**
 * Helper: returns the sidebar tint for the current theme.
 */
export function getSidebarTint(module: ModuleKey, resolvedTheme: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' ? SIDEBAR_TINTS[module].dark : SIDEBAR_TINTS[module].light;
}
