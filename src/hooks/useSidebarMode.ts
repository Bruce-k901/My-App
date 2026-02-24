'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useUserPreferences } from '@/context/UserPreferencesContext';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useMediaQuery } from '@/hooks/useIsMobile';

export type SidebarMode = 'collapsed' | 'expanded';

const LOCAL_KEY = 'opsly_sidebar_pinned';
const EXPANDED_WIDTH = '256px';
const COLLAPSED_WIDTH = '64px';
const HOVER_LEAVE_DELAY = 300; // ms before collapsing after mouse leave

/**
 * Shared hook for module sidebar expanded/collapsed state.
 *
 * Priority:
 *  1. Pin override (Zustand store + sessionStorage — resets per browser session)
 *  2. User preference (sidebar_mode from settings)
 *
 * Supports hover-expand: when collapsed, hovering the sidebar slides it out
 * as an overlay. Moving the mouse away collapses it back after a short delay.
 */
export function useSidebarMode() {
  const { preferences, updatePreference } = useUserPreferences();
  const prefMode = preferences.sidebar_mode ?? 'expanded';

  // Shared pin state via Zustand — syncs across all hook consumers (sidebar + layout)
  const pinOverride = useSidebarStore((s) => s.pinOverride);
  const setPinOverride = useSidebarStore((s) => s.setPinOverride);

  // Hover expand state (local — each sidebar manages its own hover)
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate pin override from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(LOCAL_KEY);
      if (stored === 'collapsed' || stored === 'expanded') {
        setPinOverride(stored);
      }
    } catch { /* SSR / private browsing */ }
  }, [setPinOverride]);

  // Clean up hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  // Auto-collapse on mobile/tablet viewports (below lg / 1024px) — matches sidebar visibility breakpoint
  const belowLg = useMediaQuery('(max-width: 1023px)');

  const mode: SidebarMode = belowLg ? 'collapsed' : (pinOverride ?? prefMode);
  const isCollapsed = mode === 'collapsed';
  const canPin = !belowLg;

  // Whether to render expanded content (pinned expanded OR hover-expanded)
  const showExpanded = !isCollapsed || isHoverExpanded;

  // layoutWidth: used by dashboard layout for content margins (stable, doesn't change on hover)
  const layoutWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  // displayWidth: used by sidebar element itself (changes on hover)
  const displayWidth = showExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  // Hover handlers for collapsed sidebar slide-out
  const handleMouseEnter = useCallback(() => {
    if (!isCollapsed) return;
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setIsHoverExpanded(true);
  }, [isCollapsed]);

  const handleMouseLeave = useCallback(() => {
    if (!isCollapsed) return;
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setIsHoverExpanded(false);
    }, HOVER_LEAVE_DELAY);
  }, [isCollapsed]);

  // Toggle pin: flips between collapsed/expanded as a session override
  const togglePin = useCallback(() => {
    const next: SidebarMode = isCollapsed ? 'expanded' : 'collapsed';
    setPinOverride(next);
    setIsHoverExpanded(false);
    try { sessionStorage.setItem(LOCAL_KEY, next); } catch { /* ignore */ }
  }, [isCollapsed, setPinOverride]);

  // Save to user preferences (persists long-term)
  const saveAsDefault = useCallback((m: SidebarMode) => {
    updatePreference('sidebar_mode', m);
    setPinOverride(null);
    setIsHoverExpanded(false);
    try { sessionStorage.removeItem(LOCAL_KEY); } catch { /* ignore */ }
  }, [updatePreference, setPinOverride]);

  return {
    mode,
    isCollapsed,
    showExpanded,
    isHoverExpanded,
    canPin,
    displayWidth,
    layoutWidth,
    width: layoutWidth, // backward compat — used by layout for margins
    handleMouseEnter,
    handleMouseLeave,
    togglePin,
    saveAsDefault,
  };
}
