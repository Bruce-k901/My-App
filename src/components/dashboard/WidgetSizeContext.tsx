'use client';

import { createContext, useContext } from 'react';
import type { WidgetSize } from '@/types/dashboard';

const WidgetSizeContext = createContext<WidgetSize>('medium');

export const WidgetSizeProvider = WidgetSizeContext.Provider;

/**
 * Hook to get the current widget's effective size and max display items.
 * Must be used inside a WidgetSizeProvider (wrapped by WidgetGrid).
 */
export function useWidgetSize(): { size: WidgetSize; maxItems: number } {
  const size = useContext(WidgetSizeContext);
  const maxItems =
    size === 'tall' ? 8 :
    size === 'wide' ? 5 :
    size === 'large' ? 10 :
    3; // small, medium
  return { size, maxItems };
}
