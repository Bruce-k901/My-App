'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from '@/components/ui/icons';

interface StaffItem {
  id: string;
  full_name: string;
  position_title: string | null;
}

interface StaffMemberPickerProps {
  value: string | null;
  onChange: (staffId: string | null, staffName: string) => void;
  staffList: StaffItem[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function StaffMemberPicker({
  value,
  onChange,
  staffList,
  placeholder = 'Select staff member...',
  required = false,
  className = '',
}: StaffMemberPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStaff = staffList.find((s) => s.id === value);

  const filteredStaff = staffList.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.position_title && s.position_title.toLowerCase().includes(search.toLowerCase()))
  );

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

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  function handleSelect(staff: StaffItem) {
    onChange(staff.id, staff.full_name);
    setIsOpen(false);
    setSearch('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null, '');
    setSearch('');
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-2
          bg-black/[0.04] dark:bg-white/[0.06] border rounded-lg
          text-left transition-colors cursor-pointer
          ${isOpen
            ? 'border-module-fg/50 ring-1 ring-module-fg/20'
            : 'border-black/15 dark:border-white/[0.1] hover:border-black/25 dark:hover:border-white/[0.2]'
          }
        `}
      >
        {selectedStaff ? (
          <div className="min-w-0">
            <span className="text-theme-primary truncate block">{selectedStaff.full_name}</span>
            {selectedStaff.position_title && (
              <span className="text-xs text-theme-tertiary truncate block">{selectedStaff.position_title}</span>
            )}
          </div>
        ) : (
          <span className="text-theme-tertiary">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)}
              className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors cursor-pointer"
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
        <div className="absolute z-[60] w-full mt-1 bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-lg shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-black/10 dark:border-white/10">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-tertiary" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="
                  w-full pl-9 pr-3 py-2
                  bg-black/[0.04] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-md
                  text-theme-primary placeholder-gray-400 dark:placeholder-slate-500
                  focus:outline-none focus:border-module-fg/50
                  text-sm
                "
              />
            </div>
          </div>

          {/* Staff list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredStaff.length === 0 ? (
              <div className="px-3 py-4 text-center text-theme-tertiary text-sm">
                No staff found
              </div>
            ) : (
              filteredStaff.map((staff) => (
                <button
                  key={staff.id}
                  type="button"
                  onClick={() => handleSelect(staff)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2.5
                    text-left transition-colors
                    ${staff.id === value
                      ? 'bg-module-fg/10 dark:bg-module-fg/10'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                    }
                  `}
                >
                  <div className="min-w-0">
                    <span className={`block text-sm font-medium truncate ${
                      staff.id === value ? 'text-module-fg' : 'text-theme-primary'
                    }`}>
                      {staff.full_name}
                    </span>
                    {staff.position_title && (
                      <span className="block text-xs text-theme-tertiary truncate">
                        {staff.position_title}
                      </span>
                    )}
                  </div>
                  {staff.id === value && <Check size={16} className="text-module-fg flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hidden input for form validation */}
      {required && (
        <input
          type="text"
          value={value || ''}
          required
          className="sr-only"
          tabIndex={-1}
          onChange={() => {}}
        />
      )}
    </div>
  );
}
