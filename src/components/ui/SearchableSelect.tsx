'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from '@/components/ui/icons';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected option label
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  function handleSelect(optionValue: string) {
    onValueChange(optionValue);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange('');
    setSearch('');
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2.5
          bg-white/[0.03] border border-theme rounded-lg
          text-left transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-600 cursor-pointer'}
          ${isOpen ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20' : ''}
        `}
      >
        <span className={selectedOption ? 'text-theme-primary' : 'text-theme-tertiary'}>
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="p-0.5 hover:bg-white/10 rounded transition-colors cursor-pointer"
            >
              <X size={14} className="text-theme-tertiary" />
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-theme-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#14161c]/95 border border-theme rounded-lg shadow-xl overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-theme">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search${placeholder ? '...' : '...'}`}
                className="
                  w-full pl-9 pr-3 py-2
                  bg-neutral-100 dark:bg-white/[0.05] border border-theme rounded-md
                  text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500
                  focus:outline-none focus:ring-2 focus:ring-ring
                  text-sm
                "
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-neutral-500 dark:text-neutral-400 text-sm">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5
                    text-left text-sm transition-colors
                    ${option.value === value
                      ? 'bg-neutral-100 dark:bg-white/[0.08] text-neutral-900 dark:text-white font-medium'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {option.value === value && <Check size={16} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
