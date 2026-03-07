'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface SupplierSearchInputProps {
  value: string;
  onChange: (name: string) => void;
  companyId: string | null;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function SupplierSearchInput({
  value,
  onChange,
  companyId,
  disabled = false,
  className = '',
  placeholder = 'Search or type supplier name...',
}: SupplierSearchInputProps) {
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch suppliers on mount / companyId change
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (!error && !cancelled) {
        setSuppliers(data || []);
      }
    })();

    return () => { cancelled = true; };
  }, [companyId]);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suppliers based on input (case-insensitive includes)
  const filtered = inputValue.trim()
    ? suppliers.filter(s => s.name.toLowerCase().includes(inputValue.toLowerCase().trim()))
    : suppliers;

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-supplier-item]');
      items[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIsOpen(true);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleSelect = useCallback((name: string) => {
    setInputValue(name);
    onChange(name);
    setIsOpen(false);
    setHighlightIndex(-1);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) {
      if (e.key === 'ArrowDown' && filtered.length > 0) {
        setIsOpen(true);
        setHighlightIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          handleSelect(filtered[highlightIndex].name);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;
    }
  }, [isOpen, filtered, highlightIndex, handleSelect]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {isOpen && !disabled && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-[200px] overflow-y-auto rounded-lg border border-theme bg-white dark:bg-[#1C1916] shadow-lg"
        >
          {filtered.map((supplier, index) => (
            <button
              key={supplier.id}
              type="button"
              data-supplier-item
              onClick={() => handleSelect(supplier.name)}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === highlightIndex
                  ? 'bg-emerald-50 dark:bg-emerald-600/10 text-emerald-700 dark:text-emerald-400'
                  : 'text-theme-primary hover:bg-gray-50 dark:hover:bg-white/[0.05]'
              } ${
                supplier.name.toLowerCase() === inputValue.toLowerCase().trim()
                  ? 'font-medium'
                  : ''
              }`}
            >
              {supplier.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
