'use client';

import { useEffect } from 'react';

/**
 * Global fix for iOS PWA keyboard obscuring focused inputs.
 * When a text input receives focus, waits for the keyboard animation
 * to finish then scrolls the element into view.
 */
export function useKeyboardScrollFix() {
  useEffect(() => {
    // Only needed on mobile / touch devices
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const tag = target.tagName.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
      if (!isEditable) return;

      // Skip inputs that are type=checkbox, radio, etc. (no keyboard)
      if (tag === 'input') {
        const type = (target as HTMLInputElement).type;
        if (['checkbox', 'radio', 'range', 'file', 'color'].includes(type)) return;
      }

      // Wait for iOS keyboard animation to finish (~350ms)
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Ensure the element is still focused
        if (document.activeElement === target) {
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 400);
    };

    document.addEventListener('focusin', handleFocusIn, { passive: true });

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);
}
