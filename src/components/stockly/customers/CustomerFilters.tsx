"use client";

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Search } from 'lucide-react';

interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  stats: {
    total: number;
    active: number;
    pendingInvites: number;
  };
}

export default function CustomerFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  stats,
}: CustomerFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onValueChange={onStatusFilterChange}
            options={[
              { label: 'All Customers', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Paused', value: 'paused' },
              { label: 'Pending Setup', value: 'pending' },
              { label: 'Archived', value: 'archived' },
            ]}
            placeholder="Filter by status"
            className="[&>div>button]:focus:border-emerald-500 [&>div>button]:focus:shadow-[0_0_14px_rgba(16,185,129,0.4)] [&>div>button]:hover:shadow-[0_0_10px_rgba(16,185,129,0.25)]"
          />
        </div>

        {/* Sort By */}
        <div className="w-full sm:w-48">
          <Select
            value={sortBy}
            onValueChange={onSortByChange}
            options={[
              { label: 'Sort by Name', value: 'name' },
              { label: 'Recently Added', value: 'recent' },
              { label: 'Most Orders', value: 'orders' },
              { label: 'Highest Value', value: 'value' },
            ]}
            placeholder="Sort by"
            className="[&>div>button]:focus:border-emerald-500 [&>div>button]:focus:shadow-[0_0_14px_rgba(16,185,129,0.4)] [&>div>button]:hover:shadow-[0_0_10px_rgba(16,185,129,0.25)]"
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2">
          <div className="text-2xl font-bold text-emerald-400">{stats.total}</div>
          <div className="text-xs text-white/60">Total Customers</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2">
          <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          <div className="text-xs text-white/60">Active</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-2">
          <div className="text-2xl font-bold text-emerald-400">{stats.pendingInvites}</div>
          <div className="text-xs text-white/60">Pending Invites</div>
        </div>
      </div>
    </div>
  );
}

