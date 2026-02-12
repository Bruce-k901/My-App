'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { GridCell } from './GridCell';
import { cn } from '@/lib/utils';

interface BakeGroup {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  default_ship_state: 'baked' | 'frozen';
  can_ship_frozen: boolean;
  bake_group?: BakeGroup | null;
}

interface QuickEntryGridProps {
  products: Product[];
  weekDates: Date[];
  cells: Record<string, number>;
  prices: Record<string, number>;
  onCellUpdate: (productId: string, date: string, value: number) => void;
  calculateRowTotal: (productId: string) => { quantity: number; value: number };
}

// Group icons for bake groups
const GROUP_ICONS: Record<string, string> = {
  'Croissants': '🥐',
  'Swirls': '🌀',
  'Cookies': '🍪',
  'Buns': '🥖',
  'Savory': '🧀',
  'Savoury': '🧀',
  'Bread': '🍞',
  'Pastries': '🥧',
  'Cakes': '🎂',
  'Tarts': '🥧',
  'Pies': '🥧',
  'Muffins': '🧁',
  'Doughnuts': '🍩',
  'Donuts': '🍩',
};

function getGroupIcon(groupName: string): string {
  // Check exact match first
  if (GROUP_ICONS[groupName]) return GROUP_ICONS[groupName];

  // Check partial match
  const lowerName = groupName.toLowerCase();
  for (const [key, icon] of Object.entries(GROUP_ICONS)) {
    if (lowerName.includes(key.toLowerCase())) return icon;
  }

  return '📦';
}

export function QuickEntryGrid({
  products,
  weekDates,
  cells,
  prices,
  onCellUpdate,
  calculateRowTotal,
}: QuickEntryGridProps) {
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Group products by bake group
  const groupedProducts = useMemo(() => {
    const groups: Record<string, Product[]> = {};

    products.forEach(product => {
      const groupName = product.bake_group?.name || 'Other';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(product);
    });

    // Sort groups by the sort_order of their first product's bake group
    const sortedGroups = Object.entries(groups).sort(([, aProducts], [, bProducts]) => {
      const aOrder = aProducts[0]?.bake_group?.sort_order ?? 999;
      const bOrder = bProducts[0]?.bake_group?.sort_order ?? 999;
      return aOrder - bOrder;
    });

    return sortedGroups;
  }, [products]);

  // Build flat list for navigation (tracking group headers)
  const flatProductList = useMemo(() => {
    const list: Product[] = [];
    groupedProducts.forEach(([, groupProducts]) => {
      list.push(...groupProducts);
    });
    return list;
  }, [groupedProducts]);

  const registerRef = useCallback((key: string, ref: HTMLInputElement | null) => {
    if (ref) {
      cellRefs.current.set(key, ref);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  const handleNavigate = useCallback(
    (rowIndex: number, colIndex: number) => {
      const clampedRow = Math.max(0, Math.min(flatProductList.length - 1, rowIndex));
      const clampedCol = Math.max(0, Math.min(6, colIndex));

      const key = `${clampedRow}:${clampedCol}`;
      const targetRef = cellRefs.current.get(key);
      if (targetRef) {
        targetRef.focus();
      }
    },
    [flatProductList.length]
  );

  const getCellValue = (productId: string, date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${productId}:${dateStr}`;
    return cells[key] || 0;
  };

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Track global row index for navigation
  let globalRowIndex = 0;

  return (
    <div className="rounded-lg border border-theme bg-white dark:bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-white/[0.03] border-b border-theme">
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-neutral-900 w-44 px-2 py-1.5 text-left text-xs font-medium text-theme-secondary">
                Product
              </th>
              {weekDates.map((date, index) => (
                <th
                  key={date.toISOString()}
                  className={cn(
                    'w-14 px-1 py-1.5 text-center font-medium',
                    index >= 5
                      ? 'text-[#14B8A6] bg-[#14B8A6]/5 dark:bg-[#14B8A6]/10'
                      : 'text-theme-secondary'
                  )}
                >
                  <div className="text-xs">{dayNames[index]}</div>
                  <div className="text-[10px] font-normal text-theme-tertiary">
                    {format(date, 'd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedProducts.map(([groupName, groupProducts]) => (
              <React.Fragment key={groupName}>
                {/* Group Header */}
                <tr className="bg-gray-100/70 dark:bg-white/[0.04]">
                  <td
                    colSpan={8}
                    className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-theme-secondary"
                  >
                    {getGroupIcon(groupName)} {groupName}
                  </td>
                </tr>

                {/* Product Rows */}
                {groupProducts.map((product) => {
                  const currentRowIndex = globalRowIndex++;
                  return (
                    <tr
                      key={product.id}
                      className="border-t border-gray-100 dark:border-white/[0.04] hover:bg-theme-surface-elevated/50 dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-theme-surface px-2 py-0.5 border-r border-gray-100 dark:border-white/[0.04]">
                        <span className="text-sm text-theme-primary pl-3 truncate block">
                          {product.name}
                        </span>
                      </td>
                      {weekDates.map((date, colIndex) => (
                        <td
                          key={date.toISOString()}
                          className={cn(
                            'px-0.5 py-0.5',
                            colIndex >= 5 && 'bg-[#14B8A6]/5 dark:bg-[#14B8A6]/5'
                          )}
                        >
                          <GridCell
                            productId={product.id}
                            date={format(date, 'yyyy-MM-dd')}
                            value={getCellValue(product.id, date)}
                            rowIndex={currentRowIndex}
                            colIndex={colIndex}
                            onUpdate={onCellUpdate}
                            onNavigate={handleNavigate}
                            registerRef={registerRef}
                            compact
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
