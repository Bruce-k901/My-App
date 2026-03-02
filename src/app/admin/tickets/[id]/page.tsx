'use client';

import { use, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTicket } from '@/hooks/tickets/useTicket';
import { useTicketComments } from '@/hooks/tickets/useTicketComments';
import { TicketStatusBadge } from '@/components/tickets/TicketStatusBadge';
import { TicketPriorityBadge } from '@/components/tickets/TicketPriorityBadge';
import { TicketModuleBadge } from '@/components/tickets/TicketModuleBadge';
import { TicketTypeBadge } from '@/components/tickets/TicketTypeBadge';
import { TicketStatusDropdown } from '@/components/tickets/TicketStatusDropdown';
import { TicketPriorityDropdown } from '@/components/tickets/TicketPriorityDropdown';
import { TicketCommentThread } from '@/components/tickets/TicketCommentThread';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// ADMIN TICKET DETAIL PAGE
// ============================================================================
// Full ticket view with conversation thread and management controls
// Admin is always light mode — uses explicit colors, not theme variables
// ============================================================================

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const {
    ticket,
    isLoading,
    error,
    refetch,
    updateStatus,
    updatePriority,
    markAsRead,
  } = useTicket({ ticketId: resolvedParams.id, isAdmin: true });

  const {
    addComment,
    deleteComment,
  } = useTicketComments({
    ticketId: resolvedParams.id,
    isAdmin: true,
    onCommentAdded: refetch,
    onCommentDeleted: refetch,
  });

  // Mark as read when opened (once only)
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (ticket && ticket.unread_count > 0 && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      markAsRead();
    }
  }, [ticket, markAsRead]);

  const handleStatusChange = async (newStatus: any) => {
    try {
      await updateStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: any) => {
    try {
      await updatePriority(newPriority);
    } catch (err) {
      console.error('Failed to update priority:', err);
      alert('Failed to update priority');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteComment(commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading ticket...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error || 'Ticket not found'}
        </div>
        <Link
          href="/admin/tickets"
          className="inline-block mt-4 text-[#D37E91] hover:underline"
        >
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to tickets
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {ticket.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <TicketTypeBadge type={ticket.type} />
              <TicketModuleBadge module={ticket.module} />
              <span className="text-sm text-gray-500">
                {ticket.company?.name}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ticket #{ticket.id.substring(0, 8)}</span>
          </div>
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Status
            </label>
            <TicketStatusDropdown
              value={ticket.status}
              onChange={handleStatusChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Priority
            </label>
            <TicketPriorityDropdown
              value={ticket.priority}
              onChange={handlePriorityChange}
            />
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Created by:</span>
            <div className="font-medium text-gray-900">
              {ticket.created_by_profile?.full_name || 'Unknown'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Assigned to:</span>
            <div className="font-medium text-gray-900">
              {ticket.assigned_to_profile?.full_name || 'Unassigned'}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <div className="font-medium text-gray-900">
              {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Site:</span>
            <div className="font-medium text-gray-900">
              {ticket.site?.name || 'N/A'}
            </div>
          </div>
        </div>

        {/* Page URL */}
        {ticket.page_url && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-500">Page URL:</span>
            <a
              href={ticket.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-[#D37E91] hover:underline truncate mt-1"
            >
              {ticket.page_url}
            </a>
          </div>
        )}
      </div>

      {/* Original Description */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>

        {/* Initial attachments (screenshots) */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Attachments:</h3>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={`/api/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Conversation ({ticket.comment_count})
        </h2>
        <TicketCommentThread
          ticketId={ticket.id}
          comments={ticket.comments || []}
          onAddComment={addComment}
          onDeleteComment={handleDeleteComment}
          canCreateInternal={true}
          currentUserId={ticket.created_by}
          isAdmin={true}
        />
      </div>
    </div>
  );
}
