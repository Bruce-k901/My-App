'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { TicketModuleBadge } from '@/components/tickets/TicketModuleBadge';
import { TicketTypeBadge } from '@/components/tickets/TicketTypeBadge';
import { ChevronLeft } from '@/components/ui/icons';
import { formatDistanceToNow } from 'date-fns';
import type { TicketListItem } from '@/types/tickets';

// ============================================================================
// USER MY TICKETS PAGE
// ============================================================================
// User view of their own submitted tickets
// ============================================================================

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  useEffect(() => {
    const fetchTickets = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter.length > 0) {
          params.append('status', statusFilter.join(','));
        }

        const response = await fetch(`/api/tickets/my-tickets?${params.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch tickets');
        }

        const data = await response.json();
        setTickets(data.tickets || []);
      } catch (err: any) {
        console.error('Error fetching tickets:', err);
        setError(err.message || 'Failed to load tickets');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [statusFilter]);

  const toggleStatusFilter = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back to Help */}
      <button
        onClick={() => router.push('/dashboard/help')}
        className="flex items-center gap-1.5 text-sm text-theme-tertiary hover:text-theme-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Help
      </button>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-theme-primary">My Support Tickets</h1>
        <p className="text-theme-secondary mt-1">
          Tickets you&apos;ve submitted to the support team
        </p>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-theme-secondary">Filter by status:</span>
        {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => toggleStatusFilter(status)}
            className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
              statusFilter.includes(status)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-700 text-theme-secondary border-gray-300 dark:border-gray-600 hover:border-blue-500'
            }`}
          >
            {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
        {statusFilter.length > 0 && (
          <button
            onClick={() => setStatusFilter([])}
            className="px-3 py-1 rounded-lg text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-theme">
        {isLoading ? (
          <div className="p-8 text-center text-theme-tertiary">Loading tickets...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 dark:text-red-400">{error}</div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-theme-tertiary">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-lg font-medium mb-2">No tickets found</p>
            <p className="text-sm">
              {statusFilter.length > 0
                ? 'Try adjusting your filters'
                : 'You haven\'t submitted any support tickets yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/support/my-tickets/${ticket.id}`}
                className="block p-4 hover:bg-theme-surface-elevated dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-theme-primary truncate">
                        {ticket.title}
                      </h3>
                      {ticket.unread_count > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-medium">
                          {ticket.unread_count} new
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-theme-secondary line-clamp-2 mb-3">
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
                    <div className="mb-1">Handled by: {ticket.assigned_to_name}</div>
                    <div className="mb-1">
                      {ticket.comment_count} {ticket.comment_count === 1 ? 'reply' : 'replies'}
                    </div>
                    <div>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
