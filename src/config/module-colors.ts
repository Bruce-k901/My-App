/**
 * Module colour hex values for inline styles.
 *
 * The canonical colour definitions live as CSS variables in globals.css.
 * Tailwind classes (bg-checkly, text-planly, border-stockly/20 …) are
 * wired to those variables via tailwind.config.js and should be preferred.
 *
 * Each module has a colour pair: light (for dark theme) + dark (for light theme).
 * Use MODULE_HEX only where an actual hex string is required — for example
 * in `style={{ color: … }}` or when computing rgba() in JS.
 */

export type ModuleKey = 'checkly' | 'stockly' | 'teamly' | 'planly' | 'assetly' | 'msgly';

export const MODULE_HEX: Record<ModuleKey, { light: string; dark: string }> = {
  checkly: { light: '#F1E194', dark: '#5B0E14' },
  stockly: { light: '#789A99', dark: '#4e7d7c' },
  teamly:  { light: '#D37E91', dark: '#b0607a' },
  planly:  { light: '#ACC8A2', dark: '#1A2517' },
  assetly: { light: '#F3E7D9', dark: '#544349' },
  msgly:   { light: '#CBDDE9', dark: '#2872A1' },
} as const;

export const SIDEBAR_TINTS: Record<ModuleKey, { dark: string; light: string }> = {
  checkly: { dark: '#12140e', light: '#f8f1e8' },
  stockly: { dark: '#0d1414', light: '#edf3f3' },
  teamly:  { dark: '#14100e', light: '#f6eff1' },
  planly:  { dark: '#0e120d', light: '#eff3ee' },
  assetly: { dark: '#131110', light: '#f5f2ef' },
  msgly:   { dark: '#0d1114', light: '#eef2f5' },
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
 * Helper: returns the sidebar tint for the current theme.
 */
export function getSidebarTint(module: ModuleKey, resolvedTheme: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' ? SIDEBAR_TINTS[module].dark : SIDEBAR_TINTS[module].light;
}
