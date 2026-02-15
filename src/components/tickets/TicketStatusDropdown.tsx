'use client';

import { TicketStatus } from '@/types/tickets';
import { TicketStatusBadge } from './TicketStatusBadge';

// ============================================================================
// TICKET STATUS DROPDOWN
// ============================================================================
// Dropdown selector for changing ticket status
// ============================================================================

interface TicketStatusDropdownProps {
  value: TicketStatus;
  onChange: (status: TicketStatus) => void;
  disabled?: boolean;
}

const STATUS_OPTIONS: TicketStatus[] = ['open', 'in_progress', 'resolved', 'closed'];

export function TicketStatusDropdown({ value, onChange, disabled = false }: TicketStatusDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketStatus)}
        disabled={disabled}
        className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border border-white/[0.06] bg-white/[0.06] text-theme-primary focus:outline-none focus:ring-2 focus:ring-[#D37E91] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status} className="bg-[#0B0D13] text-white">
            {status === 'in_progress'
              ? 'In Progress'
              : status.charAt(0).toUpperCase() + status.slice(1)}
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
export function TicketStatusBadgeDropdown({ value, onChange, disabled = false }: TicketStatusDropdownProps) {
  return (
    <div className="relative group">
      <button
        type="button"
        disabled={disabled}
        className="flex items-center gap-1 disabled:cursor-not-allowed"
      >
        <TicketStatusBadge status={value} />
        <svg className="w-4 h-4 text-theme-tertiary group-hover:text-theme-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Hidden select for functionality */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TicketStatus)}
        disabled={disabled}
        className="absolute inset-0 opacity-0 cursor-pointer"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status === 'in_progress'
              ? 'In Progress'
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
