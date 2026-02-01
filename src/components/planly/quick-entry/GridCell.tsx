'use client';

import { useRef, useCallback, KeyboardEvent, ChangeEvent, FocusEvent } from 'react';
import { cn } from '@/lib/utils';

interface GridCellProps {
  productId: string;
  date: string;
  value: number;
  rowIndex: number;
  colIndex: number;
  onUpdate: (productId: string, date: string, value: number) => void;
  onNavigate: (rowIndex: number, colIndex: number) => void;
  registerRef: (key: string, ref: HTMLInputElement | null) => void;
  compact?: boolean;
}

export function GridCell({
  productId,
  date,
  value,
  rowIndex,
  colIndex,
  onUpdate,
  onNavigate,
  registerRef,
  compact = false,
}: GridCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const refCallback = useCallback(
    (element: HTMLInputElement | null) => {
      inputRef.current = element;
      registerRef(`${rowIndex}:${colIndex}`, element);
    },
    [rowIndex, colIndex, registerRef]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onUpdate(productId, date, Math.max(0, newValue));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Move left, or up and to end of previous row
          if (colIndex > 0) {
            onNavigate(rowIndex, colIndex - 1);
          } else if (rowIndex > 0) {
            onNavigate(rowIndex - 1, 6);
          }
        } else {
          // Move right, or down and to start of next row
          if (colIndex < 6) {
            onNavigate(rowIndex, colIndex + 1);
          } else {
            onNavigate(rowIndex + 1, 0);
          }
        }
        break;

      case 'Enter':
        e.preventDefault();
        onNavigate(rowIndex + 1, colIndex);
        break;

      case 'ArrowUp':
        e.preventDefault();
        onNavigate(rowIndex - 1, colIndex);
        break;

      case 'ArrowDown':
        e.preventDefault();
        onNavigate(rowIndex + 1, colIndex);
        break;

      case 'ArrowLeft':
        // Only navigate if cursor is at the start
        if (input.selectionStart === 0 && input.selectionEnd === 0) {
          e.preventDefault();
          onNavigate(rowIndex, colIndex - 1);
        }
        break;

      case 'ArrowRight':
        // Only navigate if cursor is at the end
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          onNavigate(rowIndex, colIndex + 1);
        }
        break;

      case 'Escape':
        input.blur();
        break;
    }
  };

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <input
      ref={refCallback}
      type="number"
      min={0}
      value={value || ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder="0"
      className={cn(
        'w-full text-center bg-transparent border-0 rounded',
        compact ? 'h-7 text-sm' : 'h-10',
        'text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/20',
        'focus:outline-none focus:bg-[#14B8A6]/10 focus:ring-2 focus:ring-[#14B8A6] focus:ring-inset',
        'hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors',
        '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
      )}
      data-row={rowIndex}
      data-col={colIndex}
    />
  );
}
