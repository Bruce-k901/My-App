import { createPortal } from 'react-dom';

/**
 * Portal fixed-position overlays (sheets, modals, drawers) to `#overlay-root`,
 * which sits outside `<main>` in the dashboard layout.
 *
 * WHY: On iOS, `<main>` (scroll container with overflow) creates a stacking
 * context that traps fixed-position children. Their z-indexes can never beat
 * the BottomTabBar (z-50) which is a sibling of `<main>`. Portaling to
 * `#overlay-root` (also a sibling of `<main>` inside `.dashboard-page`)
 * escapes this trap while preserving module CSS variable inheritance.
 */
export function portalToOverlayRoot(element: React.ReactNode): React.ReactPortal | null {
  if (typeof document === 'undefined') return null;
  const root = document.getElementById('overlay-root') || document.body;
  return createPortal(element, root);
}
