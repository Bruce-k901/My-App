'use client';

import { Search, X } from '@/components/ui/icons';

interface MobileItemSearchProps {
  placeholder?: string;
  value: string;
  onChange: (query: string) => void;
  onClear: () => void;
  totalCount: number;
  filteredCount: number;
}

export default function MobileItemSearch({
  placeholder = 'Search items...',
  value,
  onChange,
  onClear,
  totalCount,
  filteredCount,
}: MobileItemSearchProps) {
  const isFiltered = value.trim().length > 0;

  return (
    <div className="flex items-center gap-2 bg-theme-surface border border-theme rounded-xl px-3 py-2">
      <Search className="h-4 w-4 text-theme-tertiary flex-shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-theme-primary placeholder:text-theme-tertiary outline-none text-sm min-w-0"
      />
      {isFiltered && (
        <>
          <span className="text-xs text-theme-tertiary whitespace-nowrap">
            {filteredCount}/{totalCount}
          </span>
          <button
            onClick={onClear}
            className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="h-3.5 w-3.5 text-theme-tertiary" />
          </button>
        </>
      )}
    </div>
  );
}
