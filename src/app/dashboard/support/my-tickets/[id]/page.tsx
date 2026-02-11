'use client';

import { use, useEffect } from 'react';
import Link from 'next/link';
import { useTicket } from '@/hooks/tickets/useTicket';
import { useTicketComments } from '@/hooks/tickets/useTicketComments';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { TicketModuleBadge } from '@/components/tickets/TicketModuleBadge';
import { TicketTypeBadge } from '@/components/tickets/TicketTypeBadge';
import { TicketCommentThread } from '@/components/tickets/TicketCommentThread';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// USER TICKET DETAIL PAGE
// ============================================================================
// User view of their own ticket with conversation
// ============================================================================

export default function MyTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  const {
    ticket,
    isLoading,
    error,
    refetch,
    markAsRead,
  } = useTicket({ ticketId: resolvedParams.id, isAdmin: false });

  const {
    addComment,
  } = useTicketComments({
    ticketId: resolvedParams.id,
    isAdmin: false,
    onCommentAdded: refetch,
  });

  // Mark as read when opened
  useEffect(() => {
    if (ticket && ticket.unread_count > 0) {
      markAsRead();
    }
  }, [ticket, markAsRead]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error || 'Ticket not found'}
        </div>
        <Link
          href="/dashboard/support/my-tickets"
          className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to my tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Link
        href="/dashboard/support/my-tickets"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to my tickets
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <TicketTypeBadge type={ticket.type} />
              <TicketModuleBadge module={ticket.module} />
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Assigned to:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {ticket.assigned_to_profile?.full_name || 'Support Team'}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Site:</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {ticket.site?.name || 'N/A'}
            </div>
          </div>
        </div>

        {/* Page URL */}
        {ticket.page_url && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Page URL:</span>
            <a
              href={ticket.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-blue-600 dark:text-blue-400 hover:underline truncate mt-1"
            >
              {ticket.page_url}
            </a>
          </div>
        )}
      </div>

      {/* Original Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h2>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>

        {/* Initial attachments (screenshots) */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments:</h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={`/api/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                  {attachment.file_name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Conversation ({ticket.comment_count})
        </h2>
        <TicketCommentThread
          ticketId={ticket.id}
          comments={ticket.comments || []}
          onAddComment={addComment}
          canCreateInternal={false}
          currentUserId={ticket.created_by}
          isAdmin={false}
        />
      </div>
    </div>
  );
}
