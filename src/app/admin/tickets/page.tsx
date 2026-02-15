'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTickets } from '@/hooks/tickets/useTickets';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { TicketModuleBadge } from '@/components/tickets/TicketModuleBadge';
import { TicketTypeBadge } from '@/components/tickets/TicketTypeBadge';
import { formatDistanceToNow } from 'date-fns';
import type { TicketFilters, TicketStatsResponse } from '@/types/tickets';

// ============================================================================
// ADMIN TICKETS LIST PAGE
// ============================================================================
// Main admin page for viewing and managing all tickets
// Features: filtering, search, stats, pagination
// ============================================================================

export default function AdminTicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>({});
  const [stats, setStats] = useState<TicketStatsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { tickets, total, page, isLoading, error, nextPage, prevPage, hasMore, refetch, setFilters: updateFilters } = useTickets({
    filters,
    pageSize: 20,
  });

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/tickets/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchStats();
  }, []);

  const handleSearch = () => {
    updateFilters({ ...filters, search: searchQuery || undefined });
  };

  const handleStatusFilter = (status: string) => {
    const currentStatus = filters.status || [];
    const newStatus = currentStatus.includes(status as any)
      ? currentStatus.filter(s => s !== status)
      : [...currentStatus, status as any];
    updateFilters({ ...filters, status: newStatus.length > 0 ? newStatus as any : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-primary">Support Tickets</h1>
          <p className="text-theme-tertiary mt-1">
            Manage and respond to customer support requests
          </p>
        </div>
        <Link
          href="/api/admin/tickets/export"
          className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-theme-primary hover:bg-white/[0.09] transition-colors"
        >
          Export CSV
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-sm text-theme-tertiary">Total Tickets</div>
            <div className="text-2xl font-bold text-theme-primary mt-1">{stats.total}</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-sm text-theme-tertiary">Open</div>
            <div className="text-2xl font-bold text-blue-400 mt-1">{stats.open}</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-sm text-theme-tertiary">In Progress</div>
            <div className="text-2xl font-bold text-yellow-400 mt-1">{stats.in_progress}</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
            <div className="text-sm text-theme-tertiary">High Priority</div>
            <div className="text-2xl font-bold text-orange-400 mt-1">
              {stats.high_priority + stats.urgent_priority}
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 space-y-4">
        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search tickets..."
            className="flex-1 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-theme-primary placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#D37E91]"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 rounded-lg bg-[#D37E91] text-white hover:bg-[#D37E91]/80 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-theme-tertiary">Filter by status:</span>
          {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                filters.status?.includes(status as any)
                  ? 'bg-[#D37E91] text-white border-[#D37E91]'
                  : 'bg-white/[0.06] text-theme-secondary border-white/[0.06] hover:border-[#D37E91]/50'
              }`}
            >
              {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
          {filters.status && filters.status.length > 0 && (
            <button
              onClick={() => updateFilters({ ...filters, status: undefined })}
              className="px-3 py-1 rounded-lg text-sm text-red-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg">
        {isLoading ? (
          <div className="p-8 text-center text-theme-tertiary">Loading tickets...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-theme-tertiary">
            No tickets found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/[0.06]">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-theme-primary truncate">
                          {ticket.title}
                        </h3>
                        {ticket.unread_count > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-medium">
                            {ticket.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-theme-tertiary line-clamp-2 mb-3">
                        {ticket.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <TicketStatusBadge status={ticket.status} />
                        <TicketPriorityBadge priority={ticket.priority} />
                        <TicketTypeBadge type={ticket.type} />
                        <TicketModuleBadge module={ticket.module} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 text-sm text-theme-tertiary">
                      <div className="mb-1">{ticket.company_name}</div>
                      <div className="mb-1">Created by: {ticket.created_by_name}</div>
                      {ticket.assigned_to_name && (
                        <div className="mb-1">Assigned to: {ticket.assigned_to_name}</div>
                      )}
                      <div className="mb-1">
                        {ticket.comment_count} {ticket.comment_count === 1 ? 'comment' : 'comments'}
                      </div>
                      <div>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {total > 20 && (
              <div className="p-4 border-t border-white/[0.06] flex items-center justify-between">
                <div className="text-sm text-theme-tertiary">
                  Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total} tickets
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={prevPage}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/[0.09] transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={!hasMore}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-theme-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/[0.09] transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
