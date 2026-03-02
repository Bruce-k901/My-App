/** Mobile layout constants — single source of truth
 *
 * Import these instead of hardcoding values like '3.5rem', 'z-50', or
 * 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' across components.
 *
 * Keep in sync with --bottom-tab-height in globals.css.
 */

/** Height of the BottomTabBar (py-1 + button padding + icon 22px + label) */
export const BOTTOM_TAB_HEIGHT = '3.5rem';

/** CSS calc for positioning directly above the tab bar on mobile */
export const ABOVE_TAB_BAR = 'calc(3.5rem + env(safe-area-inset-bottom, 0px))';

/** CSS calc with breathing room (for toasts, FABs) */
export const ABOVE_TAB_BAR_SPACED = 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.5rem)';

/** Tailwind class fragments for common positioning patterns */
export const MOBILE_LAYOUT = {
  /** Bottom sheet content padding to clear the tab bar */
  sheetPadding: 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
  /** Toast/FAB: above tab bar on mobile, normal on desktop */
  aboveTabBar: 'bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] lg:bottom-4',
  /** Page content padding to clear the tab bar */
  pageContent: 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]',
  /** Safe area only (no tab bar offset — for elements that overlay the tab bar) */
  safeBottom: 'pb-[env(safe-area-inset-bottom,0px)]',
} as const;

/** Z-index layers for mobile overlays.
 *
 * Stacking order (lowest to highest):
 *   tabBar (50) → sheetBackdrop (59) → sheet (60) → toast (9999) → modal (9999) → keyboard (10001)
 */
export const MOBILE_Z = {
  tabBar: 'z-50',
  sheetBackdrop: 'z-[59]',
  sheet: 'z-[60]',
  toast: 'z-[9999]',
  modal: 'z-[9999]',
  keyboard: 'z-[10001]',
} as const;
