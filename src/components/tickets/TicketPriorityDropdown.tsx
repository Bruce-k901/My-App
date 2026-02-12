'use client';

import { TicketPriority } from '@/types/tickets';
import { TicketPriorityBadge } from './TicketPriorityBadge';

// ============================================================================
// TICKET PRIORITY DROPDOWN
// ============================================================================
// Dropdown selector for changing ticket priority
// ============================================================================

interface TicketPriorityDropdownProps {
  value: TicketPriority;
  onChange: (priority: TicketPriority) => void;
  disabled?: boolean;
}

const PRIORITY_OPTIONS: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export function TicketPriorityDropdown({ value, onChange, disabled = false }: TicketPriorityDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketPriority)}
        disabled={disabled}
        className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-white/[0.06] bg-white/[0.06] text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority} className="bg-[#0B0D13] text-white">
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </option>
        ))}
      </select>

      {/* Dropdown icon */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-theme-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// Alternative: Badge-style dropdown
export function TicketPriorityBadgeDropdown({ value, onChange, disabled = false }: TicketPriorityDropdownProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        disabled={disabled}
        className="flex items-center gap-1 disabled:cursor-not-allowed"
      >
        <TicketPriorityBadge priority={value} />
        <svg className="w-4 h-4 text-theme-tertiary group-hover:text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hidden select for functionality */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketPriority)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
