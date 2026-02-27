'use client';

import { Search } from '@/components/ui/icons';
import type { ComplianceCategory } from '@/types/compliance';

export interface ComplianceFilterState {
  status: 'all' | 'compliant' | 'action_required' | 'expiring_soon';
  category: ComplianceCategory | 'all';
  department: string;
  site: string;
  expiryWindow: 'all' | '30' | '60' | '90';
  search: string;
}

interface ComplianceFiltersProps {
  filters: ComplianceFilterState;
  onChange: (filters: ComplianceFilterState) => void;
  departments: string[];
  sites: { id: string; name: string }[];
}

const SELECT_CLS =
  'px-3 py-2 rounded-lg bg-theme-surface-elevated border border-theme text-sm text-theme-primary focus:outline-none focus:ring-1 focus:ring-teamly/50';

export function ComplianceFilters({
  filters,
  onChange,
  departments,
  sites,
}: ComplianceFiltersProps) {
  const set = (partial: Partial<ComplianceFilterState>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={filters.status}
        onChange={(e) => set({ status: e.target.value as ComplianceFilterState['status'] })}
        className={SELECT_CLS}
      >
        <option value="all">All Statuses</option>
        <option value="action_required">Action Required</option>
        <option value="expiring_soon">Expiring Soon</option>
        <option value="compliant">Compliant</option>
      </select>

      <select
        value={filters.category}
        onChange={(e) => set({ category: e.target.value as ComplianceFilterState['category'] })}
        className={SELECT_CLS}
      >
        <option value="all">All Categories</option>
        <option value="right_to_work">Right to Work</option>
        <option value="dbs">DBS Checks</option>
        <option value="training">Training</option>
        <option value="documents">Documents</option>
        <option value="probation">Probation</option>
      </select>

      {departments.length > 0 && (
        <select
          value={filters.department}
          onChange={(e) => set({ department: e.target.value })}
          className={SELECT_CLS}
        >
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      )}

      {sites.length > 1 && (
        <select
          value={filters.site}
          onChange={(e) => set({ site: e.target.value })}
          className={SELECT_CLS}
        >
          <option value="all">All Sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      <select
        value={filters.expiryWindow}
        onChange={(e) => set({ expiryWindow: e.target.value as ComplianceFilterState['expiryWindow'] })}
        className={SELECT_CLS}
      >
        <option value="all">All Expiry</option>
        <option value="30">Within 30 days</option>
        <option value="60">Within 60 days</option>
        <option value="90">Within 90 days</option>
      </select>

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-secondary" />
        <input
          type="text"
          placeholder="Search employees..."
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          className={`${SELECT_CLS} w-full pl-9`}
        />
      </div>
    </div>
  );
}
